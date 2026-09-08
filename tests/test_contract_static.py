from pathlib import Path


SOURCE = Path("contracts/recall_route.py").read_text(encoding="utf-8")


def test_no_unpinned_or_broad_web_source_path():
    assert "raw.githubusercontent.com" in SOURCE
    assert "len(commit) == 40" in SOURCE
    assert "SOURCE_DIGEST_MISMATCH" in SOURCE
    assert "CITATION_NOT_UNIQUE" in SOURCE


def test_owner_acceptance_is_on_critical_path():
    assert "accepted_digest" in SOURCE
    assert "DOSSIER_DIGEST_MISMATCH" in SOURCE
    assert 'case.status != "READY" or str(case.accepted_digest) != str(case.dossier_digest)' in SOURCE


def test_positive_route_is_deterministically_gated():
    assert 'return "MANUAL_REVIEW"' in SOURCE
    assert 'return "NOT_AFFECTED"' in SOURCE
    assert 'return "AFFECTED"' in SOURCE
    assert 'result["coverage"] != "SUFFICIENT"' in SOURCE


def test_only_one_nondeterministic_boundary_exists():
    assert SOURCE.count("gl.vm.run_nondet_unsafe") == 1
    assert SOURCE.count("gl.nondet.exec_prompt") == 1
