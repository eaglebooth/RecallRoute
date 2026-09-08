import hashlib
import json
import time

import pytest

pytest.importorskip("gltest")
import gltest.direct.loader as direct_loader


CONTRACT = "contracts/recall_route.py"
COMMIT = "a" * 40
ORIGIN = "https://raw.githubusercontent.com/example/recallroute-fixtures"
OEM_URL = f"{ORIGIN}/{COMMIT}/oem.txt"
REG_URL = f"{ORIGIN}/{COMMIT}/regulator.txt"
OEM_CITATION = "RR48-OEM-SCOPE-2026"
REG_CITATION = "RR48-REGULATOR-SCOPE-2026"
OEM = "OEM BAT-XR48 batch NS-24-Q2 serial XR48001000-XR48001999 DEMO-EU 2026-01-01 to 2026-06-30. STOP_USE and REPLACE. " + OEM_CITATION
REG = "REGULATOR confirms BAT-XR48 batch NS-24-Q2 serial XR48001000-XR48001999 DEMO-EU 2026-01-01 to 2026-06-30. STOP_USE and REPLACE. " + REG_CITATION


@pytest.fixture(autouse=True)
def _windows_fd0_cleanup_workaround(monkeypatch):
    original = direct_loader._inject_message_to_fd0

    def inject(vm):
        try:
            original(vm)
        except PermissionError:
            pass

    monkeypatch.setattr(direct_loader, "_inject_message_to_fd0", inject)


def sha(text):
    return hashlib.sha256(text.encode()).hexdigest()


def address(raw):
    return "0x" + raw.hex()


MATCH = {
    "model_relation": "MATCH", "serial_relation": "MATCH", "batch_relation": "MATCH",
    "date_relation": "MATCH", "region_relation": "MATCH", "remedy_relation": "MATCH", "action_relation": "MATCH",
    "coverage": "SUFFICIENT",
    "contradiction": False, "remedy": "REPLACE", "immediate_action": "STOP_USE",
    "reason": "Both exact notices include every bound product fact and agree on routing.",
}


def deploy(direct_vm, direct_deploy, authority):
    direct_vm.strict_mocks = True
    direct_vm.check_pickling = True
    direct_vm.sender = authority
    return direct_deploy(CONTRACT)


def create(contract, owner, now=None):
    now = int(time.time()) if now is None else now
    contract.create_case("RR-48-001", address(owner), "RR-48", "BAT-XR48", "XR48001482",
                         "NS-24-Q2", "2026-03-14", "DEMO-EU", 0, now + 3600)


def add_sources(contract):
    contract.add_notice("RR-48-001", "0", "OEM", ORIGIN, OEM_URL, sha(OEM), len(OEM.encode()), OEM_CITATION)
    contract.add_notice("RR-48-001", "1", "REGULATOR", ORIGIN, REG_URL, sha(REG), len(REG.encode()), REG_CITATION)


def ready(contract, direct_vm, authority, owner):
    direct_vm.sender = authority
    create(contract, owner)
    add_sources(contract)
    digest = contract.seal_case("RR-48-001")
    direct_vm.sender = owner
    contract.accept_case("RR-48-001", digest)


def mock_assessment(direct_vm, result, oem=OEM, regulator=REG):
    direct_vm.clear_mocks()
    direct_vm.mock_web(OEM_URL, {"status": 200, "body": oem})
    direct_vm.mock_web(REG_URL, {"status": 200, "body": regulator})
    direct_vm.mock_llm(r".*", json.dumps(result))


def test_version_and_counts(direct_vm, direct_deploy, direct_owner):
    contract = deploy(direct_vm, direct_deploy, direct_owner)
    assert json.loads(contract.get_contract_version()) == {"name": "RecallRoute", "schema": "sealed-two-source-v1", "version": 1}
    assert json.loads(contract.get_counts()) == {"case_count": 0, "finalized_count": 0}


def test_exact_dossier_acceptance_binds_product_and_both_sources(direct_vm, direct_deploy, direct_owner, direct_alice):
    contract = deploy(direct_vm, direct_deploy, direct_owner)
    create(contract, direct_alice)
    add_sources(contract)
    digest = contract.seal_case("RR-48-001")
    assert len(digest) == 64
    direct_vm.sender = direct_alice
    contract.accept_case("RR-48-001", digest)
    case = json.loads(contract.get_case("RR-48-001"))
    assert case["status"] == "READY" and case["accepted_digest"] == case["dossier_digest"]
    assert case["product_model"] == "BAT-XR48" and case["source_count"] == 2


def test_wrong_owner_or_digest_cannot_accept(direct_vm, direct_deploy, direct_owner, direct_alice):
    contract = deploy(direct_vm, direct_deploy, direct_owner)
    create(contract, direct_alice)
    add_sources(contract)
    digest = contract.seal_case("RR-48-001")
    before = contract.get_case("RR-48-001")
    with pytest.raises(Exception, match="OWNER_ONLY"):
        contract.accept_case("RR-48-001", digest)
    direct_vm.sender = direct_alice
    with pytest.raises(Exception, match="DOSSIER_DIGEST_MISMATCH"):
        contract.accept_case("RR-48-001", "0" * 64)
    assert contract.get_case("RR-48-001") == before


def test_only_supported_product_and_distinct_owner(direct_vm, direct_deploy, direct_owner, direct_alice):
    contract = deploy(direct_vm, direct_deploy, direct_owner)
    now = int(time.time())
    with pytest.raises(Exception, match="UNSUPPORTED_PRODUCT_MODEL"):
        contract.create_case("BAD-001", address(direct_alice), "RR-48", "OTHER", "XR48001482", "NS-24-Q2", "2026-03-14", "DEMO-EU", 0, now + 3600)
    with pytest.raises(Exception, match="INVALID_OWNER"):
        contract.create_case("BAD-002", address(direct_owner), "RR-48", "BAT-XR48", "XR48001482", "NS-24-Q2", "2026-03-14", "DEMO-EU", 0, now + 3600)


def test_source_order_roles_and_commit_pin_enforced(direct_vm, direct_deploy, direct_owner, direct_alice):
    contract = deploy(direct_vm, direct_deploy, direct_owner)
    create(contract, direct_alice)
    with pytest.raises(Exception, match="INVALID_SOURCE_ORDER"):
        contract.add_notice("RR-48-001", "0", "REGULATOR", ORIGIN, REG_URL, sha(REG), len(REG.encode()), REG_CITATION)
    with pytest.raises(Exception, match="INVALID_SOURCE_POLICY"):
        contract.add_notice("RR-48-001", "0", "OEM", ORIGIN, f"{ORIGIN}/main/oem.txt", sha(OEM), len(OEM.encode()), OEM_CITATION)


def test_source_set_immutable_after_seal(direct_vm, direct_deploy, direct_owner, direct_alice):
    contract = deploy(direct_vm, direct_deploy, direct_owner)
    create(contract, direct_alice)
    add_sources(contract)
    contract.seal_case("RR-48-001")
    with pytest.raises(Exception, match="SOURCE_SET_LOCKED"):
        contract.add_notice("RR-48-001", "2", "REGULATOR", ORIGIN, REG_URL, sha(REG), len(REG.encode()), REG_CITATION)


@pytest.mark.parametrize(("semantic", "route"), [
    (MATCH, "AFFECTED"),
    ({**MATCH, "serial_relation": "MISMATCH", "remedy": "NONE", "immediate_action": "NONE"}, "NOT_AFFECTED"),
    ({**MATCH, "serial_relation": "UNKNOWN"}, "MANUAL_REVIEW"),
    ({**MATCH, "coverage": "PARTIAL"}, "MANUAL_REVIEW"),
    ({**MATCH, "contradiction": True}, "MANUAL_REVIEW"),
    ({**MATCH, "remedy": "UNKNOWN"}, "MANUAL_REVIEW"),
    ({**MATCH, "remedy_relation": "UNKNOWN"}, "MANUAL_REVIEW"),
    ({**MATCH, "action_relation": "MISMATCH"}, "MANUAL_REVIEW"),
])
def test_semantic_truth_table(direct_vm, direct_deploy, direct_owner, direct_alice, semantic, route):
    contract = deploy(direct_vm, direct_deploy, direct_owner)
    ready(contract, direct_vm, direct_owner, direct_alice)
    mock_assessment(direct_vm, semantic)
    assert contract.assess_case("RR-48-001") == route
    case = json.loads(contract.get_case("RR-48-001"))
    assert case["status"] == "ASSESSED" and case["route"] == route
    if route != "AFFECTED":
        assert case["remedy"] in ("NONE", "UNKNOWN")


@pytest.mark.parametrize("bad", [
    {**MATCH, "coverage": "YES"},
    {**MATCH, "contradiction": "maybe"},
    {**MATCH, "serial_relation": "MAYBE"},
    {key: value for key, value in MATCH.items() if key != "region_relation"},
])
def test_malformed_model_output_rolls_back(direct_vm, direct_deploy, direct_owner, direct_alice, bad):
    contract = deploy(direct_vm, direct_deploy, direct_owner)
    ready(contract, direct_vm, direct_owner, direct_alice)
    before = contract.get_case("RR-48-001")
    mock_assessment(direct_vm, bad)
    with pytest.raises(Exception, match="INVALID_MODEL_OUTPUT"):
        contract.assess_case("RR-48-001")
    assert contract.get_case("RR-48-001") == before


@pytest.mark.parametrize("bad", [
    {**MATCH, "model_relation": "IN_SCOPE"},
    {**MATCH, "coverage": "COMPLETE"},
    {**MATCH, "contradiction": "false"},
    {**MATCH, "extra": "not allowed"},
])
def test_alias_coercion_and_extra_fields_fail_closed(direct_vm, direct_deploy, direct_owner, direct_alice, bad):
    contract = deploy(direct_vm, direct_deploy, direct_owner)
    ready(contract, direct_vm, direct_owner, direct_alice)
    before = contract.get_case("RR-48-001")
    mock_assessment(direct_vm, bad)
    with pytest.raises(Exception, match="INVALID_MODEL_OUTPUT"):
        contract.assess_case("RR-48-001")
    assert contract.get_case("RR-48-001") == before


def test_source_tampering_and_duplicate_citation_fail_closed(direct_vm, direct_deploy, direct_owner, direct_alice):
    contract = deploy(direct_vm, direct_deploy, direct_owner)
    ready(contract, direct_vm, direct_owner, direct_alice)
    before = contract.get_case("RR-48-001")
    tampered = OEM[:-1] + "X"
    direct_vm.clear_mocks()
    direct_vm.mock_web(OEM_URL, {"status": 200, "body": tampered})
    with pytest.raises(Exception, match="OEM_SOURCE_DIGEST_MISMATCH"):
        contract.assess_case("RR-48-001")
    assert contract.get_case("RR-48-001") == before


def test_reassessment_and_double_finalization_rejected(direct_vm, direct_deploy, direct_owner, direct_alice):
    contract = deploy(direct_vm, direct_deploy, direct_owner)
    ready(contract, direct_vm, direct_owner, direct_alice)
    mock_assessment(direct_vm, MATCH)
    contract.assess_case("RR-48-001")
    with pytest.raises(Exception, match="CASE_NOT_ASSESSABLE"):
        contract.assess_case("RR-48-001")
    assert contract.finalize_case("RR-48-001") == "AFFECTED"
    with pytest.raises(Exception, match="CASE_NOT_FINALIZABLE"):
        contract.finalize_case("RR-48-001")
    with pytest.raises(Exception, match="CASE_NOT_EXPIRABLE"):
        contract.expire_to_manual_review("RR-48-001")


def test_assessed_and_cancelled_cases_cannot_be_overwritten_by_expiry(direct_vm, direct_deploy, direct_owner, direct_alice):
    contract = deploy(direct_vm, direct_deploy, direct_owner)
    ready(contract, direct_vm, direct_owner, direct_alice)
    mock_assessment(direct_vm, MATCH)
    contract.assess_case("RR-48-001")
    before = contract.get_case("RR-48-001")
    with pytest.raises(Exception, match="CASE_NOT_EXPIRABLE"):
        contract.expire_to_manual_review("RR-48-001")
    assert contract.get_case("RR-48-001") == before

    direct_vm.sender = direct_owner
    now = int(time.time())
    contract.create_case("RR-CANCEL", address(direct_alice), "RR-48", "BAT-XR48", "XR48001482", "NS-24-Q2", "2026-03-14", "DEMO-EU", 0, now + 3600)
    contract.cancel_draft("RR-CANCEL")
    cancelled = contract.get_case("RR-CANCEL")
    with pytest.raises(Exception, match="CASE_NOT_EXPIRABLE"):
        contract.expire_to_manual_review("RR-CANCEL")
    assert contract.get_case("RR-CANCEL") == cancelled


def test_expiry_before_deadline_fails_without_mutation(direct_vm, direct_deploy, direct_owner, direct_alice):
    contract = deploy(direct_vm, direct_deploy, direct_owner)
    ready(contract, direct_vm, direct_owner, direct_alice)
    before = contract.get_case("RR-48-001")
    with pytest.raises(Exception, match="REVIEW_STILL_OPEN"):
        contract.expire_to_manual_review("RR-48-001")
    assert contract.get_case("RR-48-001") == before


def test_exact_assessment_and_expiry_time_boundaries(direct_vm, direct_deploy, direct_owner, direct_alice, monkeypatch):
    base = 2_000_000_000
    clock = {"now": base}
    monkeypatch.setattr(time, "time", lambda: clock["now"])
    contract = deploy(direct_vm, direct_deploy, direct_owner)

    def prepare(case_id, open_at, close_at):
        direct_vm.sender = direct_owner
        contract.create_case(case_id, address(direct_alice), "RR-48", "BAT-XR48", "XR48001482",
                             "NS-24-Q2", "2026-03-14", "DEMO-EU", open_at, close_at)
        contract.add_notice(case_id, "0", "OEM", ORIGIN, OEM_URL, sha(OEM), len(OEM.encode()), OEM_CITATION)
        contract.add_notice(case_id, "1", "REGULATOR", ORIGIN, REG_URL, sha(REG), len(REG.encode()), REG_CITATION)
        digest = contract.seal_case(case_id)
        direct_vm.sender = direct_alice
        contract.accept_case(case_id, digest)

    prepare("RR-OPEN", base + 10, base + 20)
    clock["now"] = base + 9
    with pytest.raises(Exception, match="OUTSIDE_ASSESSMENT_WINDOW"):
        contract.assess_case("RR-OPEN")
    clock["now"] = base + 10
    mock_assessment(direct_vm, MATCH)
    assert contract.assess_case("RR-OPEN") == "AFFECTED"

    clock["now"] = base
    prepare("RR-CLOSE", base, base + 20)
    clock["now"] = base + 20
    with pytest.raises(Exception, match="OUTSIDE_ASSESSMENT_WINDOW"):
        contract.assess_case("RR-CLOSE")

    clock["now"] = base
    prepare("RR-EXPIRE", base, base + 20)
    clock["now"] = base + 20 + 86_400
    assert contract.expire_to_manual_review("RR-EXPIRE") == "MANUAL_REVIEW"
    expired = json.loads(contract.get_case("RR-EXPIRE"))
    assert expired["status"] == "FINALIZED" and expired["route"] == "MANUAL_REVIEW"


def test_source_unavailable_fails_closed(direct_vm, direct_deploy, direct_owner, direct_alice):
    contract = deploy(direct_vm, direct_deploy, direct_owner)
    ready(contract, direct_vm, direct_owner, direct_alice)
    before = contract.get_case("RR-48-001")
    direct_vm.clear_mocks()
    direct_vm.mock_web(OEM_URL, {"status": 503, "body": ""})
    with pytest.raises(Exception, match="OEM_SOURCE_UNAVAILABLE"):
        contract.assess_case("RR-48-001")
    assert contract.get_case("RR-48-001") == before


def test_duplicate_citation_fails_closed(direct_vm, direct_deploy, direct_owner, direct_alice):
    duplicate_contract = deploy(direct_vm, direct_deploy, direct_owner)
    direct_vm.sender = direct_owner
    create(duplicate_contract, direct_alice)
    duplicate = OEM + " " + OEM_CITATION
    duplicate_contract.add_notice("RR-48-001", "0", "OEM", ORIGIN, OEM_URL, sha(duplicate), len(duplicate.encode()), OEM_CITATION)
    duplicate_contract.add_notice("RR-48-001", "1", "REGULATOR", ORIGIN, REG_URL, sha(REG), len(REG.encode()), REG_CITATION)
    digest = duplicate_contract.seal_case("RR-48-001")
    direct_vm.sender = direct_alice
    duplicate_contract.accept_case("RR-48-001", digest)
    direct_vm.clear_mocks()
    direct_vm.mock_web(OEM_URL, {"status": 200, "body": duplicate})
    with pytest.raises(Exception, match="OEM_CITATION_NOT_UNIQUE"):
        duplicate_contract.assess_case("RR-48-001")


def test_cannot_assess_before_owner_acceptance(direct_vm, direct_deploy, direct_owner, direct_alice):
    contract = deploy(direct_vm, direct_deploy, direct_owner)
    create(contract, direct_alice)
    add_sources(contract)
    contract.seal_case("RR-48-001")
    with pytest.raises(Exception, match="CASE_NOT_ASSESSABLE"):
        contract.assess_case("RR-48-001")


def test_notice_readback_exposes_provenance(direct_vm, direct_deploy, direct_owner, direct_alice):
    contract = deploy(direct_vm, direct_deploy, direct_owner)
    create(contract, direct_alice)
    add_sources(contract)
    notice = json.loads(contract.get_notice("RR-48-001", "1"))
    assert notice["publisher_role"] == "REGULATOR" and notice["source_sha256"] == sha(REG)
