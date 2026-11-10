"""Every backend file must compile on the Python of the Dockerfile (3.11), even when the tests run on a newer Python.

3.12 accepts things 3.11 rejects (a backslash or a same-type quote inside an f-string expression, ...), so a green run on 3.12+ proves
nothing about the server.  Needs a `python3.11` on PATH; skipped (not failed) when there is none:  python backend/tests/test_python311_syntax.py"""
import os
import shutil
import subprocess
import sys

ROOT = os.path.join(os.path.dirname(__file__), "..")


def test_backend_compiles_on_python_311():
    py = shutil.which("python3.11") or (sys.executable if sys.version_info[:2] == (3, 11) else None)
    if not py:
        print("SKIP test_backend_compiles_on_python_311 (no python3.11 on PATH)")
        return
    files = [os.path.join(d, f) for top in ("app", "tests") for d, _, fs in os.walk(os.path.join(ROOT, top)) for f in fs if f.endswith(".py")]
    bad = []
    for f in files:
        r = subprocess.run([py, "-c", "import sys; compile(open(sys.argv[1], encoding='utf-8').read(), sys.argv[1], 'exec')", f], capture_output=True, text=True)
        if r.returncode:
            bad.append(f"{os.path.relpath(f, ROOT)}: {r.stderr.strip().splitlines()[-1] if r.stderr.strip() else 'error'}")
    assert not bad, "not valid on Python 3.11:\n" + "\n".join(bad)


if __name__ == "__main__":
    try:
        test_backend_compiles_on_python_311(); print("PASS test_backend_compiles_on_python_311")
    except AssertionError as e:
        print("FAIL", e); sys.exit(1)
