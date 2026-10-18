# 🎓 ប្រព័ន្ធកត់វត្តមាន និងចុះឈ្មោះសិស្ស (Student Attendance via Google Sheets)

ប្រព័ន្ធគ្រប់គ្រងការចុះឈ្មោះ និងកត់វត្តមានសិស្សតាមទូរស័ព្ទ និងកុំព្យូទ័រ ដែលផ្ទុកទិន្នន័យត្រង់ចូលទៅក្នុង **Google Sheet** របស់គ្រូដោយស្វ័យប្រវត្តិតាមរយៈ **Google Service Account**។

---

## 🌟 លក្ខណៈពិសេសចម្បង (Features)

1. **គ្មានការចំណាយលើ Database (100% Free)**: ប្រើ Google Sheet ជា Database ផ្ទាល់ខ្លួនរបស់គ្រូ។
2. **ភ្ជាប់ Sheet ងាយស្រួល (One-Click Connect)**: គ្រូគ្រាន់តែ Share Sheet ទៅកាន់ Bot Email ហើយ paste Link ចូល។ ប្រព័ន្ធនឹង Auto-generate Tab `Students` និង `Attendance` ស្វ័យប្រវត្តិ។
3. **QR Code សម្រាប់សិស្ស (Student Self-Registration)**: បង្កើត QR Code ភ្លាមៗសម្រាប់បញ្ចាំងលើ Projector ឬផ្ញើក្នុង Telegram ឱ្យសិស្សបំពេញឈ្មោះ និងថ្នាក់។
4. **កត់វត្តមានរហ័ស (Fast Attendance Marking)**: គ្រូចុចកត់ **វត្តមាន (បៃតង)**, **ច្បាប់ (លឿង)**, **អវត្តមាន (ក្រហម)** រួចចុច Save តែមួយឃ្លីក។
5. **Cloudflare Pages Ready**: រៀបចំឡើងដោយ Next.js 16 + TypeScript + Tailwind CSS សមស្របសម្រាប់ការ Deploy លើ Cloudflare Pages។

---

## 🤖 ព័ត៌មាន Bot Email សម្រាប់ Share Google Sheet
គ្រូគ្រាន់តែ Share Google Sheet របស់ខ្លួនទៅកាន់ Email នេះជា **Editor**៖
```text
attendance-bot@student-attendance-512002.iam.gserviceaccount.com
```

---

## 🚀 របៀបសាកល្បងដំណើរការនៅលើកុំព្យូទ័រ (Local Development)

Server កំពុងដំណើរការស្រាប់លើកុំព្យូទ័ររបស់អ្នក៖
👉 បើក Browser ចូលទៅកាន់៖ **[http://localhost:3000](http://localhost:3000)**

### ជំហានសាកល្បង៖
1. បើក [Google Sheets](https://sheets.new) បង្កើត Sheet ថ្មីមួយ។
2. ចុចប៊ូតុង **Share** (នៅខាងស្ដាំលើ) រួច Paste អ៊ីមែល Bot ខាងលើនេះជា **Editor**។
3. Copy Link នៃ Sheet នោះ មកដាក់ក្នុងប្រអប់លើ Web App `http://localhost:3000` រួចចុច **ភ្ជាប់ Google Sheet**។
4. សាកល្បងចុច Copy Link ឬ Scan QR Code ដើម្បីចុះឈ្មោះសិស្សម្នាក់។
5. ចូលទៅកាន់ទំព័រ **កត់វត្តមាន** ដើម្បីកត់វត្តមានសិស្ស និងចុច **រក្សាទុក**!

---

## ☁️ របៀប Deploy ទៅកាន់ Cloudflare Pages

### ជំហានទី ១៖ Push Code ទៅ GitHub
```bash
git add .
git commit -m "feat: student attendance app with google sheets"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

### ជំហានទី ២៖ ភ្ជាប់ជាមួយ Cloudflare Pages
1. ចូលទៅកាន់ [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. ចូលទៅ **Workers & Pages** -> ចុច **Create application** -> យក Tab **Pages** -> **Connect to Git**
3. ជ្រើសរើស Repository GitHub របស់អ្នក
4. កំណត់ **Build settings**:
   * **Framework preset**: `Next.js`
   * **Build command**: `npx @cloudflare/next-on-pages` (ឬ `npm run build`)
   * **Build output directory**: `.vercel/output/static` (ឬ `.next`)

### ជំហានទី ៣៖ បញ្ចូល Environment Variables ក្នុង Cloudflare Pages
នៅក្នុង Cloudflare Dashboard (Settings -> Environment variables) សូមបញ្ចូលតម្លៃពី `.env.local`៖
* `GOOGLE_SERVICE_ACCOUNT_EMAIL`
* `GOOGLE_PRIVATE_KEY`
* `GOOGLE_PROJECT_ID`
* `NEXT_PUBLIC_BOT_EMAIL`
