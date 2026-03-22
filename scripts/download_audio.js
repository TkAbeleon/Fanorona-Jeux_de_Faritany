const https = require('https');
const fs = require('fs');
const path = require('path');

const files = {
  'bg-music.mp3': 'https://commondatastorage.googleapis.com/codeskulptor-assets/bg_music.mp3',
  'move.mp3': 'https://codeskulptor-demos.commondatastorage.googleapis.com/pang/pop.mp3',
  'capture.mp3': 'https://codeskulptor-demos.commondatastorage.googleapis.com/Descent/gotitem.mp3'
};

const audioDir = path.join(__dirname, '../assets/audio');
if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

Object.entries(files).forEach(([name, url]) => {
  const dest = path.join(audioDir, name);
  const file = fs.createWriteStream(dest);
  
  https.get(url, (response) => {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log('Downloaded', name);
    });
  }).on('error', (err) => console.error(err));
});
