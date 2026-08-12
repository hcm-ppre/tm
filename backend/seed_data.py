"""Seed demo data for Talent Management. Run: python seed_data.py"""
import os
import uuid
import random
from datetime import datetime, timezone, date, timedelta
from dotenv import load_dotenv
from pathlib import Path
from pymongo import MongoClient

load_dotenv(Path(__file__).parent / ".env")
client = MongoClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

UNITS = [
    ("Engineering", "ENG", "Design, planning and technical engineering"),
    ("Operations", "OPS", "Field operations and project execution"),
    ("Human Capital", "HC", "Recruitment, talent and people management"),
    ("Finance & Accounting", "FIN", "Financial control and reporting"),
    ("Procurement", "PROC", "Supply chain and vendor management"),
    ("QHSE", "QHSE", "Quality, Health, Safety and Environment"),
    ("Business Development", "BD", "Tender, marketing and growth"),
    ("Heavy Equipment", "HE", "Fleet and heavy equipment management"),
]

POSITIONS = {
    "Engineering": ["Junior Engineer", "Site Engineer", "Senior Engineer", "Engineering Manager"],
    "Operations": ["Foreman", "Supervisor", "Project Coordinator", "Operations Manager"],
    "Human Capital": ["HR Officer", "HR Supervisor", "Talent Specialist", "HC Manager"],
    "Finance & Accounting": ["Staff Accountant", "Finance Analyst", "Finance Supervisor", "Finance Manager"],
    "Procurement": ["Procurement Officer", "Buyer", "Procurement Supervisor", "Procurement Manager"],
    "QHSE": ["Safety Officer", "QC Inspector", "QHSE Supervisor", "QHSE Manager"],
    "Business Development": ["BD Officer", "Estimator", "Tender Specialist", "BD Manager"],
    "Heavy Equipment": ["Operator", "Mechanic", "Fleet Supervisor", "Equipment Manager"],
}

FIRST = ["Budi", "Andi", "Siti", "Dewi", "Rizky", "Putri", "Agus", "Rina", "Hendra", "Maya",
         "Fajar", "Indah", "Wawan", "Nurul", "Dimas", "Lestari", "Bayu", "Ratna", "Eko", "Yusuf",
         "Citra", "Gilang", "Wulan", "Arif", "Sari", "Teguh", "Ayu", "Rahmat", "Fitri", "Joko"]
LAST = ["Santoso", "Wijaya", "Pratama", "Nugroho", "Kusuma", "Halim", "Saputra", "Handoko",
        "Wibowo", "Permana", "Setiawan", "Hartono", "Gunawan", "Utomo", "Suryadi", "Firmansyah"]

STATUS = ["KKWT", "KKWTT", "PBK", "PBT"]
STATUS_W = [0.25, 0.5, 0.15, 0.1]
EDU = ["SMA/SMK", "D3", "S1", "S1", "S1", "S2", "D4"]
GENDER = ["Male", "Female"]
MAJORS = ["Civil Engineering", "Mechanical Engineering", "Accounting", "Management",
          "Industrial Engineering", "Law", "Informatics", "Electrical Engineering", "-"]
INSTS = ["Universitas Indonesia", "ITB", "UGM", "Universitas Diponegoro", "ITS",
         "Universitas Brawijaya", "Politeknik Negeri Jakarta", "Universitas Trisakti"]


def rand_date(start_year=2012, end_year=2024):
    start = date(start_year, 1, 1)
    end = date(end_year, 12, 1)
    delta = (end - start).days
    return (start + timedelta(days=random.randint(0, delta))).isoformat()


def run():
    db.employees.delete_many({})
    db.movements.delete_many({})
    db.work_units.delete_many({})

    now = datetime.now(timezone.utc).isoformat()
    for name, code, desc in UNITS:
        db.work_units.insert_one({"id": str(uuid.uuid4()), "name": name, "code": code,
                                  "description": desc, "created_at": now})

    employees = []
    nrp_seq = 20120001
    for i in range(60):
        unit = random.choice(list(POSITIONS.keys()))
        pos = random.choice(POSITIONS[unit])
        gender = random.choice(GENDER)
        emp = {
            "id": str(uuid.uuid4()),
            "nrp": f"PP{nrp_seq}",
            "name": f"{random.choice(FIRST)} {random.choice(LAST)}",
            "position": pos,
            "work_unit": unit,
            "pg": f"PG{random.randint(3, 9)}",
            "jg": f"JG{random.randint(1, 5)}",
            "gender": gender,
            "join_date": rand_date(),
            "status": random.choices(STATUS, STATUS_W)[0],
            "education_level": random.choice(EDU),
            "major": random.choice(MAJORS),
            "institution": random.choice(INSTS),
            "created_at": now,
        }
        nrp_seq += random.randint(1, 5)
        employees.append(emp)
    db.employees.insert_many(employees)

    # movements for ~20 employees
    mv_types = ["Promotion", "Mutation", "Demotion"]
    mv_w = [0.55, 0.35, 0.1]
    for emp in random.sample(employees, 24):
        n = random.randint(1, 2)
        for _ in range(n):
            mtype = random.choices(mv_types, mv_w)[0]
            unit = emp["work_unit"]
            new_unit = random.choice([u[0] for u in UNITS]) if mtype == "Mutation" else unit
            new_pos = random.choice(POSITIONS[new_unit])
            eff = rand_date(2023, 2026)
            db.movements.insert_one({
                "id": str(uuid.uuid4()),
                "employee_id": emp["id"],
                "employee_nrp": emp["nrp"],
                "employee_name": emp["name"],
                "type": mtype,
                "spt_number": f"SPT/{random.randint(100, 999)}/PP/{eff[:4]}",
                "effective_date": eff,
                "old_position": emp["position"],
                "old_work_unit": emp["work_unit"],
                "new_position": new_pos,
                "new_work_unit": new_unit,
                "notes": "",
                "created_at": now,
            })

    print(f"Seeded {db.work_units.count_documents({})} units, "
          f"{db.employees.count_documents({})} employees, "
          f"{db.movements.count_documents({})} movements.")


if __name__ == "__main__":
    run()
