globalThis.MIDNIGHT_AUDIO = {
 'scare-1':{title:'照片出現',text:'你哋係咪唔記得咗我呀？',src:'audio/scare-1-ghost.wav',durationMs:3930},
 'scare-2':{title:'時間錯誤',text:'時間唔啱……你哋記錯咗……',src:'audio/scare-2-ghost.wav',durationMs:4890}
};
// Schedule follows actual recording lengths, including reverb tails.
const photoAt=3000,secondAt=photoAt+globalThis.MIDNIGHT_AUDIO['scare-1'].durationMs+650;
globalThis.MIDNIGHT_SCARE_TIMING={photoAt,secondAt,endAt:secondAt+globalThis.MIDNIGHT_AUDIO['scare-2'].durationMs+650};
