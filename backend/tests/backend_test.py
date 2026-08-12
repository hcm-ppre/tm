"""Backend API tests - PT PP Presisi Talent Management."""
import uuid

import pytest
import requests

from conftest import BASE_URL


# ---------------------------------------------------------------- Health / root
class TestHealth:
    def test_root(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/")
        assert r.status_code == 200
        assert "Talent Management" in r.json()["message"]


# ---------------------------------------------------------------- Auth module
class TestAuth:
    def test_admin_login_sets_httponly_cookies(self, admin_credentials):
        s = requests.Session()
        r = s.post(f"{BASE_URL}/api/auth/login", json=admin_credentials)
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == admin_credentials["email"]
        assert data["role"] == "admin"
        assert "password_hash" not in data
        cookie_headers = r.headers.get("set-cookie", "") + str(r.raw.headers.getlist("Set-Cookie"))
        assert "access_token" in cookie_headers
        assert "refresh_token" in cookie_headers
        assert "HttpOnly" in cookie_headers

    def test_viewer_login(self, viewer_credentials):
        s = requests.Session()
        r = s.post(f"{BASE_URL}/api/auth/login", json=viewer_credentials)
        assert r.status_code == 200
        assert r.json()["role"] == "viewer"

    def test_login_case_insensitive_email(self, admin_credentials):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": admin_credentials["email"].upper(), "password": admin_credentials["password"]})
        assert r.status_code == 200

    def test_login_wrong_password(self, admin_credentials):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": admin_credentials["email"], "password": "WrongPass123!"})
        assert r.status_code == 401
        assert "detail" in r.json()

    def test_login_unknown_user(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nobody_TEST@example.com", "password": "x"})
        assert r.status_code == 401

    def test_login_invalid_email_format(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "notanemail", "password": "x"})
        assert r.status_code == 422

    def test_me_requires_auth(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_me_returns_user(self, admin_client, admin_credentials):
        r = admin_client.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == admin_credentials["email"]
        assert d["role"] == "admin"
        assert "password_hash" not in d
        assert "_id" not in d

    def test_refresh_flow(self, admin_credentials):
        s = requests.Session()
        s.post(f"{BASE_URL}/api/auth/login", json=admin_credentials)
        r = s.post(f"{BASE_URL}/api/auth/refresh")
        assert r.status_code == 200
        assert s.get(f"{BASE_URL}/api/auth/me").status_code == 200

    def test_refresh_without_cookie(self):
        r = requests.post(f"{BASE_URL}/api/auth/refresh")
        assert r.status_code == 401

    def test_logout(self, admin_credentials):
        s = requests.Session()
        s.post(f"{BASE_URL}/api/auth/login", json=admin_credentials)
        r = s.post(f"{BASE_URL}/api/auth/logout")
        assert r.status_code == 200
        assert s.get(f"{BASE_URL}/api/auth/me").status_code == 401

    def test_invalid_token_rejected(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": "Bearer garbage.token.here"})
        assert r.status_code == 401

    def test_brute_force_lockout(self, admin_credentials):
        """Playbook: account should lock after 5 failed attempts."""
        codes = []
        for _ in range(6):
            r = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": "lockout_TEST@example.com", "password": "bad"})
            codes.append(r.status_code)
        assert 423 in codes or 429 in codes, f"No lockout enforced; codes={codes}"


# ---------------------------------------------------------------- Dashboard
class TestDashboard:
    def test_requires_auth(self, anon_client):
        assert anon_client.get(f"{BASE_URL}/api/dashboard/stats").status_code == 401

    def test_stats_shape(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/dashboard/stats")
        assert r.status_code == 200
        d = r.json()
        for k in ["total_employees", "total_movements", "total_units", "avg_tenure_years",
                  "by_unit", "by_status", "by_education", "tenure_bands",
                  "movement_by_type", "movement_trend"]:
            assert k in d, f"missing {k}"
        assert d["total_employees"] > 0
        assert sum(x["value"] for x in d["by_status"]) == d["total_employees"]
        assert sum(x["value"] for x in d["tenure_bands"]) == d["total_employees"]
        assert sum(x["value"] for x in d["movement_by_type"]) == d["total_movements"]

    def test_viewer_can_read_stats(self, viewer_client):
        assert viewer_client.get(f"{BASE_URL}/api/dashboard/stats").status_code == 200


# ---------------------------------------------------------------- Work Units
class TestWorkUnits:
    created = []

    @classmethod
    def teardown_class(cls):
        pass

    def test_list_units_with_counts(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/work-units")
        assert r.status_code == 200
        units = r.json()
        assert len(units) > 0
        for u in units:
            assert "_id" not in u
            assert isinstance(u["employee_count"], int)
        names = [u["name"].lower() for u in units]
        assert names == sorted(names)

    def test_unit_counts_match_employees(self, admin_client):
        units = admin_client.get(f"{BASE_URL}/api/work-units").json()
        emps = admin_client.get(f"{BASE_URL}/api/employees").json()
        for u in units:
            expected = sum(1 for e in emps if e["work_unit"] == u["name"])
            assert u["employee_count"] == expected, f"{u['name']} count mismatch"

    def test_crud_work_unit(self, admin_client):
        name = f"TEST_Unit_{uuid.uuid4().hex[:6]}"
        r = admin_client.post(f"{BASE_URL}/api/work-units", json={"name": name, "code": "TU", "description": "d"})
        assert r.status_code == 200, r.text
        unit = r.json()
        assert unit["name"] == name
        uid = unit["id"]

        # duplicate rejected
        dup = admin_client.post(f"{BASE_URL}/api/work-units", json={"name": name})
        assert dup.status_code == 400

        # update
        new_name = name + "_upd"
        up = admin_client.put(f"{BASE_URL}/api/work-units/{uid}", json={"name": new_name, "code": "TU2"})
        assert up.status_code == 200
        assert up.json()["name"] == new_name
        # persistence
        got = [u for u in admin_client.get(f"{BASE_URL}/api/work-units").json() if u["id"] == uid]
        assert got and got[0]["name"] == new_name

        # delete
        d = admin_client.delete(f"{BASE_URL}/api/work-units/{uid}")
        assert d.status_code == 200
        assert not [u for u in admin_client.get(f"{BASE_URL}/api/work-units").json() if u["id"] == uid]

    def test_delete_unit_with_employees_blocked(self, admin_client):
        units = admin_client.get(f"{BASE_URL}/api/work-units").json()
        occupied = next((u for u in units if u["employee_count"] > 0), None)
        assert occupied, "no unit with employees to test"
        r = admin_client.delete(f"{BASE_URL}/api/work-units/{occupied['id']}")
        assert r.status_code == 400
        assert "Cannot delete" in r.json()["detail"]

    def test_update_missing_unit_404(self, admin_client):
        r = admin_client.put(f"{BASE_URL}/api/work-units/{uuid.uuid4()}", json={"name": "TEST_x"})
        assert r.status_code == 404

    def test_delete_missing_unit_404(self, admin_client):
        r = admin_client.delete(f"{BASE_URL}/api/work-units/{uuid.uuid4()}")
        assert r.status_code == 404


# ---------------------------------------------------------------- Employees
@pytest.fixture
def temp_employee(admin_client):
    payload = {
        "nrp": f"TEST{uuid.uuid4().hex[:8]}", "name": "TEST_Employee", "position": "Staff",
        "work_unit": "TEST_Unit_Emp", "pg": "PG1", "jg": "JG3", "gender": "Male",
        "join_date": "2020-01-15", "status": "KKWTT", "education_level": "S1",
        "major": "Civil Engineering", "institution": "ITB",
    }
    r = admin_client.post(f"{BASE_URL}/api/employees", json=payload)
    assert r.status_code == 200, r.text
    emp = r.json()
    yield emp, payload
    admin_client.delete(f"{BASE_URL}/api/employees/{emp['id']}")
    for u in admin_client.get(f"{BASE_URL}/api/work-units").json():
        if u["name"].startswith("TEST_Unit_Emp"):
            admin_client.delete(f"{BASE_URL}/api/work-units/{u['id']}")


class TestEmployees:
    def test_requires_auth(self, anon_client):
        assert anon_client.get(f"{BASE_URL}/api/employees").status_code == 401

    def test_list_employees_enriched(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/employees")
        assert r.status_code == 200
        emps = r.json()
        assert len(emps) > 0
        e = emps[0]
        assert "_id" not in e
        assert "tenure" in e and "text" in e["tenure"]
        assert isinstance(e["movement_count"], int)
        names = [x["name"].lower() for x in emps]
        assert names == sorted(names)

    def test_create_and_persist(self, admin_client, temp_employee):
        emp, payload = temp_employee
        assert emp["nrp"] == payload["nrp"]
        assert emp["tenure"]["years"] >= 6
        g = admin_client.get(f"{BASE_URL}/api/employees/{emp['id']}")
        assert g.status_code == 200
        d = g.json()
        for k in ["name", "position", "work_unit", "status", "education_level", "major", "institution"]:
            assert d[k] == payload[k]
        assert isinstance(d["movements"], list)
        # work unit auto-created
        assert any(u["name"] == payload["work_unit"] for u in admin_client.get(f"{BASE_URL}/api/work-units").json())

    def test_tenure_calculation(self, admin_client, temp_employee):
        emp, _ = temp_employee
        t = emp["tenure"]
        assert t["total_months"] == t["years"] * 12 + t["months"]
        assert t["text"] == f"{t['years']}y {t['months']}m"

    def test_duplicate_nrp_rejected(self, admin_client, temp_employee):
        emp, payload = temp_employee
        r = admin_client.post(f"{BASE_URL}/api/employees", json={**payload, "name": "TEST_Dup"})
        assert r.status_code == 400
        assert "NRP already exists" == r.json()["detail"]

    def test_invalid_status_rejected(self, admin_client):
        r = admin_client.post(f"{BASE_URL}/api/employees", json={
            "nrp": f"TEST{uuid.uuid4().hex[:8]}", "name": "TEST_Bad", "position": "S",
            "work_unit": "TEST_Unit_Emp", "join_date": "2020-01-01", "status": "INVALID"})
        assert r.status_code == 400

    def test_missing_required_field(self, admin_client):
        r = admin_client.post(f"{BASE_URL}/api/employees", json={"name": "TEST_NoNRP"})
        assert r.status_code == 422

    def test_update_and_persist(self, admin_client, temp_employee):
        emp, payload = temp_employee
        upd = {**payload, "position": "Senior Staff", "pg": "PG5"}
        r = admin_client.put(f"{BASE_URL}/api/employees/{emp['id']}", json=upd)
        assert r.status_code == 200
        assert r.json()["position"] == "Senior Staff"
        d = admin_client.get(f"{BASE_URL}/api/employees/{emp['id']}").json()
        assert d["position"] == "Senior Staff"
        assert d["pg"] == "PG5"
        assert d["nrp"] == payload["nrp"]

    def test_update_missing_404(self, admin_client, temp_employee):
        _, payload = temp_employee
        r = admin_client.put(f"{BASE_URL}/api/employees/{uuid.uuid4()}",
                             json={**payload, "nrp": f"TEST{uuid.uuid4().hex[:8]}"})
        assert r.status_code == 404

    def test_get_missing_404(self, admin_client):
        assert admin_client.get(f"{BASE_URL}/api/employees/{uuid.uuid4()}").status_code == 404

    def test_delete_removes_employee_and_movements(self, admin_client):
        payload = {"nrp": f"TEST{uuid.uuid4().hex[:8]}", "name": "TEST_DelMe", "position": "Staff",
                   "work_unit": "TEST_Unit_Emp", "join_date": "2021-03-01", "status": "PBK"}
        emp = admin_client.post(f"{BASE_URL}/api/employees", json=payload).json()
        mv = admin_client.post(f"{BASE_URL}/api/movements", json={
            "employee_id": emp["id"], "type": "Promotion", "spt_number": "TEST/SPT/1",
            "effective_date": "2024-01-01", "new_position": "Lead", "new_work_unit": "TEST_Unit_Emp",
            "apply_to_employee": False})
        assert mv.status_code == 200
        assert admin_client.delete(f"{BASE_URL}/api/employees/{emp['id']}").status_code == 200
        assert admin_client.get(f"{BASE_URL}/api/employees/{emp['id']}").status_code == 404
        assert not [m for m in admin_client.get(f"{BASE_URL}/api/movements").json()
                    if m["employee_id"] == emp["id"]]

    def test_delete_missing_404(self, admin_client):
        assert admin_client.delete(f"{BASE_URL}/api/employees/{uuid.uuid4()}").status_code == 404


# ---------------------------------------------------------------- Movements
class TestMovements:
    def test_requires_auth(self, anon_client):
        assert anon_client.get(f"{BASE_URL}/api/movements").status_code == 401

    def test_list_sorted_desc(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/movements")
        assert r.status_code == 200
        ms = r.json()
        assert len(ms) > 0
        dates = [m["effective_date"] for m in ms]
        assert dates == sorted(dates, reverse=True)
        for m in ms[:5]:
            assert "_id" not in m
            assert m["type"] in {"Promotion", "Mutation", "Demotion"}
            assert m["employee_name"]

    def test_create_movement_applies_to_employee(self, admin_client, temp_employee):
        emp, _ = temp_employee
        body = {"employee_id": emp["id"], "type": "Promotion", "spt_number": "TEST/SPT/100",
                "effective_date": "2025-06-01", "new_position": "Manager",
                "new_work_unit": "TEST_Unit_Emp2", "notes": "TEST note", "apply_to_employee": True}
        r = admin_client.post(f"{BASE_URL}/api/movements", json=body)
        assert r.status_code == 200, r.text
        m = r.json()
        assert m["old_position"] == emp["position"]
        assert m["employee_nrp"] == emp["nrp"]
        assert m["new_position"] == "Manager"

        d = admin_client.get(f"{BASE_URL}/api/employees/{emp['id']}").json()
        assert d["position"] == "Manager"
        assert d["work_unit"] == "TEST_Unit_Emp2"
        assert any(x["id"] == m["id"] for x in d["movements"]), "movement not in profile history"

        # edit
        up = admin_client.put(f"{BASE_URL}/api/movements/{m['id']}",
                              json={**body, "type": "Mutation", "spt_number": "TEST/SPT/101"})
        assert up.status_code == 200
        assert up.json()["type"] == "Mutation"
        assert [x for x in admin_client.get(f"{BASE_URL}/api/movements").json()
                if x["id"] == m["id"]][0]["spt_number"] == "TEST/SPT/101"

        # delete
        assert admin_client.delete(f"{BASE_URL}/api/movements/{m['id']}").status_code == 200
        assert not [x for x in admin_client.get(f"{BASE_URL}/api/movements").json() if x["id"] == m["id"]]

    def test_create_movement_without_apply(self, admin_client, temp_employee):
        emp, _ = temp_employee
        r = admin_client.post(f"{BASE_URL}/api/movements", json={
            "employee_id": emp["id"], "type": "Demotion", "spt_number": "TEST/SPT/200",
            "effective_date": "2025-01-01", "new_position": "Junior",
            "new_work_unit": "OtherUnit_TEST", "apply_to_employee": False})
        assert r.status_code == 200
        mid = r.json()["id"]
        d = admin_client.get(f"{BASE_URL}/api/employees/{emp['id']}").json()
        assert d["position"] == emp["position"]
        admin_client.delete(f"{BASE_URL}/api/movements/{mid}")

    def test_invalid_type_rejected(self, admin_client, temp_employee):
        emp, _ = temp_employee
        r = admin_client.post(f"{BASE_URL}/api/movements", json={
            "employee_id": emp["id"], "type": "Transfer", "spt_number": "TEST/1",
            "effective_date": "2025-01-01", "new_position": "X", "new_work_unit": "Y"})
        assert r.status_code == 400

    def test_unknown_employee_404(self, admin_client):
        r = admin_client.post(f"{BASE_URL}/api/movements", json={
            "employee_id": str(uuid.uuid4()), "type": "Promotion", "spt_number": "TEST/1",
            "effective_date": "2025-01-01", "new_position": "X", "new_work_unit": "Y"})
        assert r.status_code == 404

    def test_update_missing_404(self, admin_client):
        r = admin_client.put(f"{BASE_URL}/api/movements/{uuid.uuid4()}", json={
            "employee_id": str(uuid.uuid4()), "type": "Promotion", "spt_number": "TEST/1",
            "effective_date": "2025-01-01", "new_position": "X", "new_work_unit": "Y"})
        assert r.status_code == 404

    def test_delete_missing_404(self, admin_client):
        assert admin_client.delete(f"{BASE_URL}/api/movements/{uuid.uuid4()}").status_code == 404


# ---------------------------------------------------------------- RBAC
class TestRBAC:
    def test_viewer_can_read(self, viewer_client):
        for ep in ["/api/employees", "/api/movements", "/api/work-units", "/api/dashboard/stats"]:
            assert viewer_client.get(f"{BASE_URL}{ep}").status_code == 200, ep

    def test_viewer_cannot_write_employees(self, viewer_client):
        r = viewer_client.post(f"{BASE_URL}/api/employees", json={
            "nrp": "TEST_RBAC", "name": "x", "position": "p", "work_unit": "w",
            "join_date": "2020-01-01", "status": "KKWT"})
        assert r.status_code == 403
        assert viewer_client.put(f"{BASE_URL}/api/employees/{uuid.uuid4()}", json={
            "nrp": "TEST_RBAC", "name": "x", "position": "p", "work_unit": "w",
            "join_date": "2020-01-01", "status": "KKWT"}).status_code == 403
        assert viewer_client.delete(f"{BASE_URL}/api/employees/{uuid.uuid4()}").status_code == 403

    def test_viewer_cannot_write_movements(self, viewer_client):
        body = {"employee_id": str(uuid.uuid4()), "type": "Promotion", "spt_number": "x",
                "effective_date": "2025-01-01", "new_position": "p", "new_work_unit": "w"}
        assert viewer_client.post(f"{BASE_URL}/api/movements", json=body).status_code == 403
        assert viewer_client.put(f"{BASE_URL}/api/movements/{uuid.uuid4()}", json=body).status_code == 403
        assert viewer_client.delete(f"{BASE_URL}/api/movements/{uuid.uuid4()}").status_code == 403

    def test_viewer_cannot_write_units(self, viewer_client):
        assert viewer_client.post(f"{BASE_URL}/api/work-units", json={"name": "TEST_RBAC_U"}).status_code == 403
        assert viewer_client.put(f"{BASE_URL}/api/work-units/{uuid.uuid4()}",
                                 json={"name": "TEST_RBAC_U"}).status_code == 403
        assert viewer_client.delete(f"{BASE_URL}/api/work-units/{uuid.uuid4()}").status_code == 403

    def test_anon_cannot_write(self, anon_client):
        assert anon_client.post(f"{BASE_URL}/api/work-units", json={"name": "TEST_anon"}).status_code == 401
