"""Local-only dialogue edit. Inputs are decoded mono PCM WAVs; originals stay untouched."""
import argparse,json,wave
from pathlib import Path
import numpy as np

def load(path):
    with wave.open(str(path)) as f:
        assert f.getsampwidth()==2,'Expected signed 16-bit PCM'
        rate=f.getframerate();channels=f.getnchannels()
        x=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').astype(np.float64)/32768
    return x.reshape(-1,channels).mean(axis=1),rate

def write(path,x,rate):
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    if x.ndim==1:x=x[:,None]
    with wave.open(str(path),'wb') as f:
        f.setnchannels(x.shape[1]);f.setsampwidth(2);f.setframerate(rate)
        f.writeframes(np.round(np.clip(x,-1,.999969)*32768).astype('<i2').tobytes())

def fft_convolve(x,h):
    length=len(x)+len(h)-1;n=1<<(length-1).bit_length()
    return np.fft.irfft(np.fft.rfft(x,n)*np.fft.rfft(h,n),n)[:length]

def edit(path,seed):
    x,rate=load(path)
    # Keep 150 ms before the first active window and 240 ms after the last.
    win=int(.02*rate);rms=np.array([np.sqrt(np.mean(x[i:i+win]**2)) for i in range(0,len(x)-win,win)])
    noise=float(np.median(rms[:max(1,int(.3/.02))]));threshold=max(.0035,noise*3.5,float(rms.max())*.055)
    active=np.flatnonzero(rms>threshold)
    if not len(active):raise ValueError('No speech found')
    start=max(0,int((active[0]*.02-.15)*rate));end=min(len(x),int(((active[-1]+1)*.02+.24)*rate))
    x=x[start:end].copy();x-=x.mean()
    # Gentle rumble removal, with no pitch shifting, time stretch or spectral denoise.
    n=1<<(len(x)-1).bit_length();freq=np.fft.rfftfreq(n,1/rate)
    highpass=(freq**2)/(freq**2+65**2)
    x=np.fft.irfft(np.fft.rfft(x,n)*highpass,n)[:len(x)]
    fade=min(int(.012*rate),len(x)//4);x[:fade]*=np.linspace(0,1,fade);x[-fade:]*=np.linspace(1,0,fade)
    length=int(1.4*rate);rng=np.random.default_rng(seed)
    channels=[]
    for ch in range(2):
        h=rng.normal(size=length)
        # Diffuse, dark reflections: low-pass the impulse, then apply a smooth decay.
        hf=np.fft.rfft(h);f=np.fft.rfftfreq(length,1/rate);hf*=1/(1+(f/3400)**4)
        h=np.fft.irfft(hf,length);t=np.arange(length)/rate
        h*=np.exp(-t/0.28);h[:int(.045*rate)]=0;h[-int(.18*rate):]*=np.linspace(1,0,int(.18*rate))
        h*=.30/np.sqrt(np.sum(h*h))
        for delay,gain in [(.10+ch*.017,.14),(.23+ch*.023,.10),(.39+ch*.029,.065),(.61+ch*.031,.035)]:h[int(delay*rate)]+=gain
        wet=fft_convolve(x,h);dry=np.pad(x,(0,len(wet)-len(x)))
        channels.append(dry+wet)
    y=np.stack(channels,axis=1)
    # Same peak headroom for both lines; retain natural speech dynamics.
    y*=.78/max(.001,float(np.max(np.abs(y))))
    fade=int(.06*rate);y[-fade:]*=np.linspace(1,0,fade)[:,None]
    info={'source_duration_s':round(len(load(path)[0])/rate,4),'source_in_s':round(start/rate,4),'source_out_s':round(end/rate,4),'speech_duration_s':round(len(x)/rate,4),'duration_s':round(len(y)/rate,6),'peak_dbfs':round(20*np.log10(max(np.max(abs(y)),1e-12)),2),'speed':1.0,'pitch':1.0,'effects':'65 Hz rumble cut; dark stereo diffuse reverb; quiet early echoes; boundary fades'}
    return y,rate,info

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('first');p.add_argument('second');p.add_argument('--output',default='lesson-04-midnight-13/eboard/audio');p.add_argument('--preview',default='output/audio/Midnight-13/female-ghost-preview.wav');args=p.parse_args()
    records=[];clips=[]
    for i,path in enumerate([args.first,args.second],1):
        y,rate,info=edit(path,130+i);out=Path(args.output)/f'scare-{i}-ghost.wav';write(out,y,rate);info['output']=out.name;records.append(info);clips.append((y,rate));print(i,json.dumps(info))
    assert clips[0][1]==clips[1][1]
    rate=clips[0][1];preview=np.concatenate([clips[0][0],np.zeros((int(.65*rate),2)),clips[1][0]])
    write(args.preview,preview,rate)
    Path(args.preview).with_suffix('.json').write_text(json.dumps(records,indent=2)+'\n')
