import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../lib/prisma';
import fs from 'fs';
import path from 'path';

// Log dosyası yapılandırması
const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, `error_log_${new Date().toISOString().split('T')[0]}.log`);

// Log dizini kontrolü
try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
} catch (error) {
  console.error('Error creating log directory:', error);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  try {
    // İsteğe bağlı kullanıcı oturumunu kontrol et (anonim log da olabilir)
    const session = await getServerSession(req, res, authOptions).catch(() => null);
    
    // Log verisini al
    const errorLog = req.body;
    
    if (!errorLog) {
      return res.status(400).json({ message: 'Log data is required' });
    }
    
    // Kullanıcı bilgisini ekle (varsa)
    if (session?.user) {
      errorLog.userId = session.user.id;
      errorLog.userName = session.user.name;
    }
    
    // IP adresi ve istemci bilgilerini ekle
    const userIp = req.headers['x-forwarded-for'] || 
                  req.socket.remoteAddress || 
                  null;
    
    errorLog.ipAddress = userIp;
    errorLog.userAgent = req.headers['user-agent'];
    errorLog.receivedAt = new Date().toISOString();
    
    // Veritabanına kaydet
    const savedLog = await prisma.errorLog.create({
      data: {
        level: errorLog.level,
        message: errorLog.message,
        stackTrace: errorLog.stack,
        context: errorLog.context ? JSON.stringify(errorLog.context) : null,
        clientId: errorLog.id,
        userId: errorLog.userId || null,
        ipAddress: errorLog.ipAddress,
        userAgent: errorLog.userAgent
      }
    });
    
    // Dosyaya da log tut (opsiyonel olarak kritik hatalar için)
    if (errorLog.level === 'critical' || errorLog.level === 'error') {
      try {
        const logMessage = `[${new Date().toISOString()}] [${errorLog.level.toUpperCase()}] ${errorLog.message}\n` +
                          `UserId: ${errorLog.userId || 'anonymous'}\n` +
                          `ClientId: ${errorLog.id}\n` +
                          `IP: ${errorLog.ipAddress}\n` +
                          `Context: ${JSON.stringify(errorLog.context)}\n` +
                          `Stack: ${errorLog.stack || 'N/A'}\n` +
                          '------------------------------\n';
        
        fs.appendFileSync(LOG_FILE, logMessage);
      } catch (fileError) {
        console.error('Error writing to log file:', fileError);
      }
    }
    
    // Yanıt dön
    return res.status(200).json({ 
      success: true, 
      id: savedLog.id,
      message: 'Error logged successfully' 
    });
    
  } catch (error) {
    console.error('Error logging handler error:', error);
    
    // Dosya sistemine fallback kayıt dene
    try {
      const emergencyLog = `[${new Date().toISOString()}] [SYSTEM ERROR] Error in logging: ${error.message}\nOriginal error: ${JSON.stringify(req.body)}\n`;
      fs.appendFileSync(LOG_FILE, emergencyLog);
    } catch (e) {
      // Son çare olarak konsola yaz
      console.error('Complete failure in error logging system:', e);
    }
    
    return res.status(500).json({ 
      success: false, 
      message: 'Error logging failed, but was recorded in fallback system' 
    });
  }
}
