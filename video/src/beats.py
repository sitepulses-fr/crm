import json
SEG=[(0.8,5.5,54),(5.5,11.2,66),(12.8,12.81,1),(13.45,27.0,100),(27.0,33.0,60)]
beats=[]
for a,b,bpm in SEG:
    t=a
    while t<b:
        beats.append(round(t,4)); t+=60/bpm
json.dump(beats,open('beats.json','w'))
print(len(beats))
