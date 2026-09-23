# TextSync demo page

Static page for the TextSync paper: a handful of Heroes-corpus clips with their
candidate dubbing lines, the line the human dub used, and the line each method
picked, next to the lip feature bank map the scorer worked from.

Live: https://9ooda.github.io/textsync-demo/

## Data and terms

The talking-head clips are **AI-generated** with LTX-2.3 and a TalkVid
audio-to-video LoRA; the people on screen are synthetic and are not real
individuals. The LoRA weights are not distributed here, and the clips are shown
for illustration, not released as a dataset.

The single line of dialogue quoted on each card comes from the Heroes corpus
(Oktem et al., 2018) and is used for research and educational purposes. No
original video, audio, or full script is included or redistributed - the dubbed
speech is synthesized with Kokoro-82M (Apache-2.0) and is not the original
recording. The prototype faces in the lip feature bank maps are small crops from
LRS3-TED, shown under its non-commercial research terms at the scale used in the
paper's figures.

Questions or removal requests: dayeonku@gm.gist.ac.kr
