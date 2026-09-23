const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');

// تهيئة البوت مع حفظ بيانات تسجيل الدخول محلياً (لكي لا تمسح الكود كل يوم)
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// إظهار كود QR في موجه الأوامر لمسحه بالهاتف
client.on('qr', (qr) => {
    console.log('📱 يرجى مسح كود QR التالي باستخدام تطبيق واتساب (الأجهزة المرتبطة):');
    qrcode.generate(qr, { small: true });
});

// عندما ينجح الاتصال
client.on('ready', () => {
    console.log('✅ تم تسجيل الدخول بنجاح! البوت الآن متصل بواتساب.');
    
    // تشغيل دالة البحث عن الأخبار فوراً للتجربة
    checkAndSendNews();
});

// دالة سحب الأخبار وإرسالها
async function checkAndSendNews() {
    try {
        console.log('⏳ جاري فحص موقع جامعة الفيوم...');
        // ملاحظة: الرابط والـ Tags أدناه تجريبية وتحتاج لتعديل حسب هيكل الموقع الفعلي
        const { data } = await axios.get('http://www.fayoum.edu.eg/news.aspx');
        const $ = cheerio.load(data);
        
        const newsTitle = $('h2.news-title').first().text().trim();
        let newsLink = $('h2.news-title').first().find('a').attr('href');
        
        if (newsTitle) {
            newsLink = 'http://www.fayoum.edu.eg/' + newsLink;
            const message = `📢 *خبر جديد من جامعة الفيوم*\n\n${newsTitle}\n\n🔗 التفاصيل: ${newsLink}`;
            
            // معرف القناة (سنقوم باستخراجه في الخطوة القادمة ونضعه هنا)
            const channelId = '1234567890@newsletter'; 
            
            await client.sendMessage(channelId, message);
            console.log('✅ تم إرسال الخبر للقناة بنجاح!');
        } else {
            console.log('لم يتم العثور على أخبار جديدة، تأكد من هيكل الموقع.');
        }
    } catch (error) {
        console.error('❌ حدث خطأ:', error.message);
    }
}

// بدء تشغيل البوت
client.initialize();