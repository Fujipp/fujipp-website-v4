# GitHub Push Guide

คู่มือนี้ใช้สำหรับ commit และ push งานขึ้น GitHub แบบแยกส่วนให้ชัดเจนตาม folder ของโปรเจกต์ โดยใช้รูปแบบ Conventional Commit เช่น `feat(frontend): ...` หรือ `fix(backend): ...`

## หลักการหลัก

- แยก commit ตามขอบเขตงานหรือ folder อย่ารวมทุกอย่างไว้ commit เดียวถ้าเป็นคนละส่วนกัน
- ใช้ scope ให้ตรงกับ folder หรือระบบที่แก้
- เขียนข้อความ commit ให้บอกผลลัพธ์ของงาน ไม่ใช่แค่บอกว่าแก้ไฟล์อะไร
- ตรวจว่าไม่มี secret หรือไฟล์ local หลุดเข้าไปก่อน push เสมอ

## ตรวจสถานะก่อนเริ่ม

```bash
git status --short --ignored
git branch --show-current
git remote -v
git log --oneline -5
```

## Commit Message Pattern

รูปแบบหลัก:

```text
type(scope): message
```

ตัวอย่าง:

```text
feat(frontend): add profile page layout
fix(backend): validate login payload
chore(docker): update compose service names
docs(readme): add setup instructions
```

## Types ที่ใช้บ่อย

| Type | ใช้เมื่อ |
| --- | --- |
| `feat` | เพิ่ม feature หรือความสามารถใหม่ |
| `fix` | แก้ bug หรือพฤติกรรมที่ผิด |
| `chore` | งาน config, dependency, tooling, maintenance |
| `docs` | แก้เอกสาร เช่น README หรือ guide |
| `refactor` | ปรับโครงสร้าง code โดยไม่เปลี่ยน behavior |
| `style` | แก้ formatting หรือ style ของ code ที่ไม่กระทบ logic |
| `test` | เพิ่มหรือแก้ test |
| `build` | แก้ build system, bundler, package manager |
| `ci` | แก้ GitHub Actions หรือ CI/CD |

## Scope ตาม Folder

| Folder | Scope | ตัวอย่าง commit |
| --- | --- | --- |
| `frontend/` | `frontend` | `feat(frontend): add dashboard navigation` |
| `backend/` | `backend` | `fix(backend): handle missing user session` |
| `database/` | `database` | `feat(database): add user profile table` |
| `docker/` | `docker` | `chore(docker): configure frontend service` |
| `infrastructure/` | `infra` | `chore(infra): add deployment variables` |
| `docs/` | `docs` | `docs(docs): add architecture notes` |
| `scripts/` | `scripts` | `chore(scripts): add local setup helper` |
| `.github/` | `ci` | `ci(github): add frontend build workflow` |
| root files | `root` หรือชื่อไฟล์ | `chore(root): update gitignore rules` |

## Pattern แยกตามงาน

### Frontend

ใช้กับไฟล์ใน `frontend/`

```bash
git add frontend
git commit -m "feat(frontend): add landing page sections"
git push origin <branch>
```

ตัวอย่าง message:

```text
feat(frontend): add responsive home layout
fix(frontend): correct app import path
chore(frontend): install bun dependencies
build(frontend): update vite configuration
```

### Backend

ใช้กับไฟล์ใน `backend/`

```bash
git add backend
git commit -m "feat(backend): add auth endpoint"
git push origin <branch>
```

ตัวอย่าง message:

```text
feat(backend): add user profile api
fix(backend): return error for invalid credentials
refactor(backend): simplify service validation
test(backend): add auth controller tests
```

### Database

ใช้กับไฟล์ใน `database/`

```bash
git add database
git commit -m "feat(database): add profile schema"
git push origin <branch>
```

ตัวอย่าง message:

```text
feat(database): add user profile migration
fix(database): correct seed user roles
docs(database): document table relationships
```

### Docker

ใช้กับไฟล์ใน `docker/`

```bash
git add docker
git commit -m "chore(docker): update compose services"
git push origin <branch>
```

ตัวอย่าง message:

```text
chore(docker): add frontend container config
fix(docker): correct service port mapping
```

### Infrastructure

ใช้กับไฟล์ใน `infrastructure/`

```bash
git add infrastructure
git commit -m "chore(infra): add production environment config"
git push origin <branch>
```

ตัวอย่าง message:

```text
chore(infra): add deployment variables
fix(infra): correct storage policy
```

### Docs

ใช้กับไฟล์เอกสาร เช่น `README.md`, `docs/`, `skills/`

```bash
git add README.md docs skills
git commit -m "docs(skills): add github push guide"
git push origin <branch>
```

ตัวอย่าง message:

```text
docs(readme): add project setup guide
docs(skills): add split push workflow
docs(docs): add frontend architecture notes
```

## กรณีแก้หลาย Folder

ให้ commit ทีละส่วน:

```bash
git add database
git commit -m "feat(database): add user profile table"

git add backend
git commit -m "feat(backend): expose user profile api"

git add frontend
git commit -m "feat(frontend): add user profile screen"

git push origin <branch>
```

ถ้างานแต่ละส่วนสัมพันธ์กันมาก สามารถ push หลัง commit ทั้งหมดได้ แต่ควรยังแยก commit ตาม folder เพื่อให้ review ง่าย

## ไฟล์ที่ไม่ควร Commit

ตรวจให้แน่ใจว่าไฟล์พวกนี้ไม่ถูก stage:

```text
node_modules/
dist/
build/
.env
.env.local
*.log
.DS_Store
coverage/
```

ถ้าต้องมีตัวอย่าง environment ให้ใช้:

```text
.env.example
.env.development.example
```

## ตรวจก่อน Push

Frontend:

```bash
cd frontend
bun install
bun run build
```

Backend:

```bash
cd backend
# run backend tests/build ตาม stack ที่ใช้
```

Git:

```bash
git status --short
git log --oneline -5
```

## Push ขึ้น GitHub

ดู branch ปัจจุบัน:

```bash
git branch --show-current
```

Push:

```bash
git push origin <branch>
```

ถ้าเป็น branch ใหม่:

```bash
git push -u origin <branch>
```

## ตัวอย่าง Flow เต็ม

```bash
git status --short --ignored

git add .gitignore README.md skills
git commit -m "docs(skills): add github push guide"

git add frontend
git commit -m "feat(frontend): add initial vue app"

git log --oneline -5
git push origin <branch>
```

## Quick Reference

```text
feat(frontend): add ...
fix(frontend): correct ...
chore(frontend): update ...
build(frontend): configure ...

feat(backend): add ...
fix(backend): handle ...
refactor(backend): simplify ...
test(backend): add ...

feat(database): add ...
fix(database): correct ...
docs(database): document ...

chore(docker): update ...
chore(infra): add ...
ci(github): add ...
docs(skills): add ...
chore(root): update ...
```
