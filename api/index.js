const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");

// --- CONFIGURAÇÕES ---
// COLOQUE O LINK DA SUA OFERTA REAL (BLACK) ABAIXO:
const URL_OFERTA_BLACK = "https://link-da-sua-oferta-aqui.com"; 

// Caminho para a Página Segura (White) local
const PATH_PAGINA_WHITE = path.join(__dirname, "..", "public", "white.html"); 

// --- FUNÇÕES DE VALIDAÇÃO ---

/**
 * Verifica se o acesso é de um dispositivo Mobile (Android ou iOS)
 */
function isMobile(userAgent) {
    return /(android|iphone|ipad|ipod)/i.test(userAgent);
}

/**
 * Verifica se o acesso é de um Bot, Ferramenta de Auditoria ou Conformidade
 */
function isBot(userAgent) {
    const userAgentLower = userAgent.toLowerCase();
    
    // Lista expandida de termos de bloqueio (Bots, Auditores, Conformidade, Cloaking Checkers)
    const blacklist = [
        // Bots de Motores de Busca e Redes Sociais
        "googlebot", "facebookexternalhit", "facebot", "adsbot-google", 
        "twitterbot", "bingbot", "slurp", "duckduckbot", "baiduspider", 
        "yandexbot", "sogou", "exabot", "ia_archiver", "facebookbot",
        "instagram", "linkedinbot", "pinterestbot", "slackbot", "telegrambot",
        "whatsapp", "applebot", "flipboard", "tumblr", "vkshare",
        
        // Ferramentas de Auditoria e Conformidade (Solicitadas pelo usuário)
        "adcheck", "adbot", "compliance", "persado", "revealbot", "madgicx",
        "google search console", "unbounce", "smart builder", "cloaking",
        "ad-shield", "fraudblaster", "meta text overlay", "overlay tool",
        
        // Ferramentas de Inspeção e Performance
        "lighthouse", "gtmetrix", "pingdom", "headless", "puppeteer",
        "selenium", "playwright", "phantomjs", "checker", "validator",
        "w3c_validator", "pagespeed", "screaming frog", "ahrefsbot", "semrushbot",
        
        // Ferramentas de Detecção de Fraude e Segurança
        "shield", "fraud", "bot", "crawler", "spider", "audit", "monitor",
        "security", "scanner", "inspect", "debug", "preview", "cloud-flare-always-online",
        
        // Outros termos comuns em ferramentas de análise de anúncios
        "ad-verification", "brand-safety", "doubleverify", "integralads",
        "moatbot", "ias", "comscore", "nielsen", "kantar"
    ];

    for (const term of blacklist) {
        if (userAgentLower.includes(term)) {
            return true;
        }
    }
    return false;
}

/**
 * Verifica a Geolocalização via API (ip-api.com)
 * Retorna o código do país (ex: BR)
 */
async function getCountryCode(ip) {
    // IPs locais para teste
    if (ip === "127.0.0.1" || ip === "::1") return "BR";

    try {
        // Usamos a API ip-api.com para validar o país
        const url = `http://ip-api.com/json/${ip}?fields=status,countryCode,hosting`;
        const response = await fetch(url);
        const data = await response.json();

        if (data && data.status === "success") {
            // Bloqueio adicional: Se o IP for identificado como Datacenter/Hosting, tratamos como Bot/White
            if (data.hosting === true) {
                return "HOSTING_DETECTED";
            }
            return data.countryCode;
        }
    } catch (error) {
        console.error("Erro ao consultar API de geolocalização:", error);
    }
    return "UNKNOWN";
}

// --- LÓGICA DE REDIRECIONAMENTO ---

module.exports = async (req, res) => {
    const userAgent = req.headers["user-agent"] || "";
    
    // Obtém o IP real, considerando proxies da Vercel/Cloudflare
    const clientIp = req.headers["x-forwarded-for"] ? req.headers["x-forwarded-for"].split(",")[0] : req.connection.remoteAddress;

    const mobile = isMobile(userAgent);
    const bot = isBot(userAgent);
    const country = await getCountryCode(clientIp);

    // Condições para a Página BLACK:
    // 1. Deve ser Mobile (Android ou iOS)
    // 2. Deve ser do Brasil (BR)
    // 3. NÃO pode ser um Bot ou ferramenta de auditoria
    // 4. NÃO pode ser um IP de Datacenter/Hosting
    if (mobile && country === "BR" && !bot) {
        // Redirecionamento direto para o link da oferta externa
        res.writeHead(302, { "Location": URL_OFERTA_BLACK });
        res.end();
    } else {
        // Serve a Página Segura (White) localmente, mantendo a URL original
        fs.readFile(PATH_PAGINA_WHITE, (err, data) => {
            if (err) {
                res.writeHead(500, { "Content-Type": "text/plain" });
                res.end("Erro ao carregar a página segura.");
                return;
            }
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(data);
        });
    }
};
