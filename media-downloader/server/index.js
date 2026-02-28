const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const ytdlp = require('yt-dlp-exec');
const ffmpeg = require('ffmpeg-static');
const { spawn } = require('child_process');

const app = express();
const port = 3002;

app.use(cors());
app.use(express.json());

// Path to the yt-dlp binary inside node_modules
const ytdlpPath = path.resolve(__dirname, 'node_modules', 'yt-dlp-exec', 'bin', 'yt-dlp.exe');
console.log('Using yt-dlp binary at:', ytdlpPath);
console.log('Using ffmpeg binary at:', ffmpeg);

app.get('/download', async (req, res) => {
  const { url, filename, formatId } = req.query;

  if (!url) {
    console.error('Download error: No URL provided');
    return res.status(400).send('URL is required');
  }

  console.log(`\n>>> FFMPEG MERGE DOWNLOAD START <<<`);
  console.log(`- Target URL: ${url.substring(0, 50)}...`);
  console.log(`- Format ID: ${formatId || 'best'}`);
  
  try {
    // 1. Get raw info to find specific URLs for video and audio
    console.log(`- Fetching stream URLs for format ${formatId}...`);
    const info = await ytdlp(url, {
      dumpSingleJson: true,
      noWarnings: true,
      format: formatId ? `${formatId}+bestaudio/best` : 'best',
      addHeader: [
        'referer:youtube.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
      ]
    });

    if (!info) throw new Error('Could not fetch format info');

    // Find the requested formats in requested_formats or raw info
    // When formatId contains '+', yt-dlp returns requested_formats
    const videoUrl = info.requested_formats ? info.requested_formats[0].url : info.url;
    const audioUrl = info.requested_formats && info.requested_formats[1] ? info.requested_formats[1].url : null;

    console.log(`- Stream URLs Found:`);
    console.log(`  V: ${videoUrl ? 'YES' : 'NO'}`);
    console.log(`  A: ${audioUrl ? 'YES' : 'NO'}`);

    if (!videoUrl) throw new Error('Source stream URL missing');

    // Set headers for download
    const ext = path.extname(filename || 'download.mp4').toLowerCase();
    let contentType = 'video/mp4';
    if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.mp3') contentType = 'audio/mpeg';

    res.setHeader('Content-Disposition', `attachment; filename="${filename || 'download.mp4'}"`);
    res.setHeader('Content-Type', contentType);

    if (!audioUrl) {
      // Just proxy the single video/audio/image stream
      console.log(`- No merging needed, proxying single stream (${contentType})...`);
      const response = await axios({ method: 'get', url: videoUrl, responseType: 'stream' });
      response.data.pipe(res);
      return;
    }

    // 2. Perform on-the-fly merging via FFmpeg
    console.log('- Merging Video + Audio on-the-fly via FFmpeg...');
    const ffmpegProcess = spawn(ffmpeg, [
      '-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5',
      '-i', videoUrl,
      '-i', audioUrl,
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-f', 'mp4',
      '-movflags', 'frag_keyframe+empty_moov',
      'pipe:1'
    ]);

    ffmpegProcess.stdout.pipe(res);

    ffmpegProcess.stderr.on('data', (data) => {
      // Log FFmpeg status briefly
      if (data.toString().includes('frame=')) {
        process.stdout.write('.');
      }
    });

    ffmpegProcess.on('close', (code) => {
      console.log(`\n- FFmpeg process finished with code ${code}`);
      if (code === 0) console.log('>>> DOWNLOAD SUCCESSFUL <<<');
    });

    req.on('close', () => {
      console.log('- User connection closed. Killing FFmpeg...');
      ffmpegProcess.kill();
    });

  } catch (error) {
    console.error('!!! DOWNLOAD FATAL ERROR !!!', error.message);
    if (!res.headersSent) {
      res.status(500).send(`Merging error: ${error.message}`);
    }
  }
});

app.get('/', (req, res) => {
  res.send('Media Downloader Backend is LIVE');
});

app.post('/extract', async (req, res) => {
  const { url } = req.body;
  console.log(`\n>>> EXTRACTION REQUEST START <<<`);
  console.log(`- Target URL: ${url}`);

  if (!url) {
    console.error('Extraction error: No URL provided');
    return res.status(400).json({ error: 'URL is required' });
  }

  // Quick check for direct image links
  if (url.match(/\.(jpg|jpeg|png|webp|gif)($|\?)/i)) {
    console.log('- Direct Image URL detected, skipping yt-dlp...');
    return res.json({
      title: 'Direct Image',
      thumbnail: url,
      duration: 'Photo',
      platform: 'Direct',
      url: url,
      formats: [{
        id: 'original',
        ext: path.extname(url).slice(1).split('?')[0] || 'jpg',
        resolution: 'Original',
        qualityLabel: 'Original Photo (Image)',
        url: url,
        hasAudio: false,
        hasVideo: false
      }]
    });
  }

  try {
    console.log('- Spawning yt-dlp process...');
    
    let info;
    try {
      info = await ytdlp(url, {
        dumpSingleJson: true,
        noWarnings: true,
        preferFreeFormats: true,
        allowUnplayableFormats: true,
        noPlaylist: true,
        extractFlat: true,
        addHeader: [
          'referer:instagram.com',
          'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
        ]
      });
    } catch (e) {
      console.warn('- Primary extraction failed, trying fallback...');
      info = await ytdlp(url, {
        dumpSingleJson: true,
        noWarnings: true,
        ignoreErrors: true,
        addHeader: [ 'user-agent:Mozilla/5.0' ]
      });
    }

    if (!info || (!info.url && !info.formats && !info.entries)) {
      throw new Error('YT-DLP found no media content');
    }

    console.log(`- Extraction successful: "${info.title || 'Untitled'}"`);
    console.log(`- Formats found: ${info.formats ? info.formats.length : 0}`);

    const isImage = (ext) => ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext?.toLowerCase());
    const mediaExt = info.ext || (info.url ? path.extname(info.url).slice(1).split('?')[0] : '');
    const currentlyImage = isImage(mediaExt);

    const allFormats = (info.formats || []);
    
    // 0. Static Images
    let images = allFormats
      .filter(f => (f.ext === 'jpg' || f.ext === 'png' || f.ext === 'webp' || f.vcodec === 'none' && f.acodec === 'none' && !f.abr))
      .map(f => ({
        id: f.format_id,
        ext: f.ext,
        resolution: f.resolution || `${f.width}x${f.height}`,
        qualityLabel: (f.format_note || 'High Quality') + ' (Image)',
        url: f.url,
        filesize: f.filesize || f.filesize_approx,
        hasAudio: false,
        hasVideo: false,
        priority: 15 
      }));

    if (images.length === 0) {
      const fallbackUrl = info.url || info.thumbnail;
      if (fallbackUrl && (fallbackUrl.includes('.jpg') || fallbackUrl.includes('.png') || fallbackUrl.includes('.webp') || fallbackUrl.includes('image') || currentlyImage)) {
        images.push({
          id: 'fallback-img',
          ext: mediaExt || 'jpg',
          resolution: 'Original',
          qualityLabel: 'Original Photo (Image)',
          url: fallbackUrl,
          hasAudio: false,
          hasVideo: false,
          priority: 15
        });
      }
    }

    // 1. Progressive
    const progressive = allFormats
      .filter(f => f.vcodec !== 'none' && f.acodec !== 'none')
      .map(f => ({
        id: f.format_id,
        ext: f.ext,
        resolution: f.resolution || `${f.width}x${f.height}`,
        qualityLabel: (f.format_note || f.height + 'p') + ' (Complete)',
        url: f.url,
        hasAudio: true,
        hasVideo: true,
        priority: 10
      }));

    // 2. High-Res Video Only
    const videoOnly = allFormats
      .filter(f => f.vcodec !== 'none' && f.acodec === 'none' && f.height > 720)
      .map(f => ({
        id: f.format_id,
        ext: f.ext,
        resolution: f.resolution || `${f.width}x${f.height}`,
        qualityLabel: (f.format_note || f.height + 'p') + ' (Video Only)',
        url: f.url,
        hasAudio: true,
        hasVideo: true,
        priority: 5
      }));

    // 3. Audio Only
    const audioOnly = allFormats
      .filter(f => f.vcodec === 'none' && f.acodec !== 'none')
      .map(f => ({
        id: f.format_id,
        ext: f.ext,
        resolution: 'Audio',
        qualityLabel: (f.abr ? Math.round(f.abr) + 'kbps' : 'High Quality') + ' (Audio)',
        url: f.url,
        hasAudio: true,
        hasVideo: false,
        priority: 1
      }));

    const formats = [...images, ...progressive, ...videoOnly, ...audioOnly]
      .sort((a, b) => b.priority - a.priority);

    if (info.entries && info.entries.length > 0) {
      info.entries.forEach((entry, idx) => {
        if (entry.url) {
          formats.push({
            id: `entry-${idx}`,
            ext: entry.ext || 'jpg',
            resolution: 'Photo',
            qualityLabel: `Slide ${idx + 1} (Image)`,
            url: entry.url,
            hasAudio: false,
            hasVideo: false,
            priority: 20
          });
        }
      });
    }

    const bestFormat = {
      id: 'best',
      ext: mediaExt || 'mp4',
      resolution: info.resolution || 'Original',
      qualityLabel: currentlyImage ? 'High Quality (Image)' : 'Auto Best (Complete)',
      url: info.url,
      hasAudio: !currentlyImage,
      hasVideo: !currentlyImage
    };

    res.json({
      title: info.title || 'Untitled',
      description: info.description || info.caption || '',
      thumbnail: info.thumbnail,
      duration: info.duration_string || (currentlyImage ? 'Photo' : ''),
      platform: info.extractor_key,
      url: info.webpage_url,
      formats: [bestFormat, ...formats].slice(0, 15) 
    });
    
  } catch (error) {
    console.error('!!! EXTRACTION FATAL ERROR !!!', error.message);
    res.status(500).json({ 
      error: 'Failed to extract media', 
      details: error.message,
      code: error.message.includes('image') || error.message.includes('photo') ? 'PHOTOS_NOT_SUPPORTED' : 'EXTRACTION_FAILED'
    });
  }
});

app.listen(port, () => {
  console.log(`\n=========================================`);
  console.log(`Backend server ready at http://localhost:${port}`);
  console.log(`=========================================\n`);
});

process.on('uncaughtException', (err) => {
  console.error('CRITICAL: Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});
