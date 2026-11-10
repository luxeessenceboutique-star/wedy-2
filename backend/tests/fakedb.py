"""A tiny in-memory stand-in for the Supabase client (enough for the route handlers the Copilot tools call)."""
import copy
import uuid


class Res:
    def __init__(self, data, count=None):
        self.data, self.count = data, count if count is not None else (len(data) if isinstance(data, list) else None)


class Query:
    def __init__(self, db, table):
        self.db, self.t, self.f, self.op, self.payload, self.lim, self.single = db, table, [], "select", None, None, False

    def select(self, *a, **k): self.op = "select"; return self
    def eq(self, k, v): self.f.append(lambda r: str(r.get(k)) == str(v)); return self
    def neq(self, k, v): self.f.append(lambda r: str(r.get(k)) != str(v)); return self
    def in_(self, k, vs): vs = [str(x) for x in vs]; self.f.append(lambda r: str(r.get(k)) in vs); return self
    def gte(self, k, v): self.f.append(lambda r: r.get(k) is not None and str(r.get(k)) >= str(v)); return self
    def lte(self, k, v): self.f.append(lambda r: r.get(k) is not None and str(r.get(k)) <= str(v)); return self
    def lt(self, k, v): self.f.append(lambda r: r.get(k) is not None and str(r.get(k)) < str(v)); return self
    def ilike(self, k, v): v = str(v).strip("%").lower(); self.f.append(lambda r: v in str(r.get(k, "")).lower()); return self
    def contains(self, *a): return self
    def order(self, *a, **k): return self
    def range(self, a, b): self.lim = b - a + 1; return self
    def limit(self, n): self.lim = n; return self
    def maybe_single(self): self.single = True; return self
    def single_(self): return self
    def insert(self, d): self.op, self.payload = "insert", d; return self
    def update(self, d): self.op, self.payload = "update", d; return self
    def delete(self): self.op = "delete"; return self

    def execute(self):
        rows = self.db.tables.setdefault(self.t, [])
        if self.op == "insert":
            items = self.payload if isinstance(self.payload, list) else [self.payload]
            out = []
            for d in items:
                d = dict(d); d.setdefault("id", str(uuid.uuid4())); rows.append(d); out.append(copy.deepcopy(d))
            return Res(out)
        m = [r for r in rows if all(f(r) for f in self.f)]
        if self.op == "update":
            for r in m: r.update(copy.deepcopy(self.payload))
            return Res(copy.deepcopy(m))
        if self.op == "delete":
            for r in m: rows.remove(r)
            return Res(m)
        data = copy.deepcopy(m[: self.lim] if self.lim else m)
        if self.single:
            return Res(data[0] if data else None)
        return Res(data, count=len(m))


class FakeDB:
    def __init__(self): self.tables = {}
    def table(self, t): return Query(self, t)
    class auth:  # noqa: N801
        class admin:  # noqa: N801
            @staticmethod
            def list_users(): return []
