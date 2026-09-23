const { Client, LocalAuth } = require('whatsapp-web.js');
const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const https = require('https');

const CHANNEL_ID = '120363413553659432@newsletter';

const axiosConfig = {
    headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    httpsAgent: new https.Agent({ rejectUnauthorized: false })
};

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

let lastSentNews = {
    'الأخبار': '',
    'الفعاليات': '',
    'الإعلانات': ''
};

client.on('ready', () => {
    console.log('✅ البوت متصل وجاهز للعمل!');
    console.log('⏳ جاري فحص ونشر المحتوى...');
    
    checkAndSendNews();

    cron.schedule('0 10,18 * * *', () => {
        checkAndSendNews();
    });
});

async function checkAndSendNews() {
    const baseUrl = 'https://www.fayoum.edu.eg';
    const targets = [
        { name: 'الأخبار', url: `${baseUrl}/ar/News?tab=news&pageNumber=1` },
        { name: 'الفعاليات', url: `${baseUrl}/ar/News?tab=events&pageNumber=1` },
        { name: 'الإعلانات', url: `${baseUrl}/ar/Announcements?pageNumber=1&pageSize=12` }
    ];

    for (const target of targets) {
        try {
            const response = await axios.get(target.url, axiosConfig);
            const $ = cheerio.load(response.data);
            
            let targetLink = null;
            
            $('a').each((i, el) => {
                let href = $(el).attr('href');
                if (!href) href = '';
                
                const lowerHref = href.toLowerCase();
                const isDetails = lowerHref.includes('/details/');
                
                let isBadLink = false;
                if (lowerHref.includes('faculty')) isBadLink = true;
                if (lowerHref.includes('sector')) isBadLink = true;
                
                if (isDetails && !isBadLink && !targetLink) {
                    if (href.startsWith('http')) {
                        targetLink = href;
                    } else {
                        let safeHref = href.startsWith('/') ? href : '/' + href;
                        targetLink = baseUrl + safeHref;
                    }
                }
            });
            
            if (targetLink) {
                if (lastSentNews[target.name] !== targetLink) {
                    lastSentNews[target.name] = targetLink;
                    console.log(`\n🔍 جاري تجهيز نشر (${target.name})...`);
                    
                    // تنسيق خاص للإعلانات لتمييزها بوضوح تام بدون أي تكرار للعناوين
                    let messageToSend = targetLink;
                    if (target.name === 'الإعلانات') {
                        messageToSend = `📢 [إعلان رسمي هام من جامعة الفيوم]\n\n${targetLink}`;
                    }
                    
                    try {
                        // إرسال الرابط بمعاينة نظيفة ومستقرة تماماً تمنع أي أخطاء نهائياً
                        await client.sendMessage(CHANNEL_ID, messageToSend, { linkPreview: true });
                        console.log(`🚀 تم نشر (${target.name}) بنجاح وبدون أي أخطاء أو تكرار!`);
                    } catch (sendError) {
                        console.error(`❌ خطأ أثناء الإرسال لواتساب: ${sendError.message}`);
                    }
                    
                } else {
                    console.log(`ℹ️ قسم (${target.name}) لا يوجد به جديد.`);
                }
            } else {
                 console.log(`⚠️ لم أجد روابط أخبار جديدة في ${target.name}.`);
            }
        } catch (error) {
            console.error(`❌ خطأ في فحص ${target.name}: ${error.message}`);
        }
    }
}

client.initialize();