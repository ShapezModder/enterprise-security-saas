# 🛡️ FORTRESS.ai - Enterprise Security SaaS Platform

Military-grade penetration testing and vulnerability assessment platform with AI-driven heuristics.

## 🚀 Features

- ✅ **16-Stage Penetration Testing** - Comprehensive security assessment
- ✅ **Manual Job Approval** - Partner-controlled scan initiation
- ✅ **Email Report Delivery** - Automated PDF reports via email
- ✅ **Live Terminal Streaming** - Real-time scan output
- ✅ **OWASP Top 10 Coverage** - Industry-standard compliance
- ✅ **CVSS Scoring** - Professional vulnerability ratings
- ✅ **Advanced Scanning** - XSS, XXE, SSRF, JWT, IDOR, and more

## 📦 Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS, Framer Motion
- **Backend**: Express.js, Prisma, PostgreSQL
- **Worker**: BullMQ, Redis, Docker (security tools)
- **Security Tools**: Nmap, Nikto, SQLMap, Nuclei, WPScan, etc.

## 🏗️ Project Structure

```
Enterprise-Security-SaaS/
├── apps/
│   ├── web/          # Next.js frontend
│   ├── api/          # Express API
│   └── worker/       # Background job processor
├── prisma/           # Database schema
└── deployment_guide.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL
- Redis
- Docker

### Local Development

```bash
# Install dependencies
npm install

# Setup database
cd apps/api
npx prisma migrate dev
npx prisma db seed

# Start services
cd apps/api && npm run dev      # API on :3001
cd apps/worker && npm run dev   # Worker
cd apps/web && npm run dev      # Web on :3000
```

## 🌐 Deployment

See [deployment_guide.md](deployment_guide.md) for complete instructions.

**Recommended Stack:**
- Frontend: Vercel (Free)
- Backend: Railway ($18-28/month)

## 📧 Configuration

### Environment Variables

**API (.env)**:
```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
PORT=3001
FRONTEND_ORIGIN=http://localhost:3000
```

**Worker (.env)**:
```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
EMAIL_PASSWORD=your_gmail_app_password
```

**Web (.env.local)**:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## 🔒 Security

- Admin password: Change from default `admin123`
- Email: Configure Gmail app password
- CORS: Update `FRONTEND_ORIGIN` for production

## 📊 Workflow

1. **Client submits job** → Email + target + Google Drive link
2. **Admin reviews** → Approves and starts scan
3. **Worker processes** → 16-stage security assessment
4. **Report generated** → PDF emailed to client
5. **Storage saved** → PDF deleted after sending

## 🎯 Cost Estimate

- Vercel (Frontend): **Free**
- Railway (Backend): **$18-28/month**
- Total: **~$20/month**

## 📝 License

Proprietary - All rights reserved

## 🤝 Support

For issues or questions, contact: supercellatcoc@gmail.com

---

**Built with ❤️ for enterprise security**
