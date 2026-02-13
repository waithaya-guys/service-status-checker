# คู่มือการ Deploy Production (Docker Compose)

เอกสารนี้ใช้อธิบายขั้นตอนการนำ Service Status Application ขึ้นระบบ Production โดยใช้ Docker Compose แบบแยก Database (App Only)

## สิ่งที่ต้องเตรียม (Prerequisites)

1.  **Docker** และ **Docker Compose** ติดตั้งบนเครื่อง Server
2.  **Database (PostgreSQL)** ที่ทำงานอยู่แล้ว (บน Host หรือ Server อื่น)
3.  ไฟล์ `.env.production` ที่ตั้งค่าถูกต้อง โดยเฉพาะ `DATABASE_URL`

## โครงสร้างไฟล์ที่เกี่ยวข้อง

- `Dockerfile`: สำหรับ Build Image ของ Application
- `docker-compose.yml`: สำหรับรัน Application Container
- `.env.production`: ค่า Environment config ต่างๆ

## ขั้นตอนการ Deploy

### 1. ตรวจสอบการตั้งค่า Database

ตรวจสอบไฟล์ `.env.production` ว่าค่า `DATABASE_URL` ชี้ไปยัง Database ที่ถูกต้อง
**สำคัญ:** ถ้า Database รันอยู่บนเครื่องเดียวกับ Docker Host (ไม่ได้อยู่ใน Network เดียวกัน) ให้ใช้ IP ของเครื่อง Host หรือ `host.docker.internal` แทน `localhost`

```env
DATABASE_URL=postgresql://user:password@host.docker.internal:5432/services_status
```

### 2. Build และ Run Container

รันคำสั่งต่อไปนี้เพื่อ Build image และเริ่มการทำงาน:

```bash
# Build image และรัน container ใน background
docker compose up -d --build
```

### 3. ตรวจสอบสถานะ

ตรวจสอบว่า Container ทำงานปกติหรือไม่:

```bash
docker compose ps
```

สถานะควรเป็น `Up (healthy)`.

### 4. ดู Logs

หากต้องการดู Logs ของ Application:

```bash
docker compose logs -f
```

## การดูแลรักษา (Maintenance)

- **Restart Service**: `docker compose restart app`
- **Stop Service**: `docker compose down`
- **Update Application**: ดึง Code ใหม่ -> แก้ไข Config (ถ้ามี) -> รัน `docker compose up -d --build` อีกครั้ง

## ความปลอดภัย (Security Features)

- **Non-root User**: App รันด้วย user `nextjs` เพื่อความปลอดภัย
- **Read-only Filesystem**: Container ถูกตั้งค่าเป็น `read_only: true` ป้องกันการแก้ไขไฟล์ระบบ
- **Health Check**: มีระบบตรวจสอบการเชื่อมต่อ Database อัตโนมัติที่ `/api/health`
