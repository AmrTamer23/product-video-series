import { Composition, Folder, staticFile, type CalculateMetadataFunction } from "remotion";
import config from "../series.config.mjs";
import { EPISODES } from "../episodes.mjs";
import { Episode, type EpisodeProps } from "./Episode";
import { FPS, totalFrames, type Timeline } from "./timeline";

type Meta = { id: string; title: string };
const episodes = EPISODES as Meta[];

const calculateMetadata: CalculateMetadataFunction<EpisodeProps> = async ({ props }) => {
  const res = await fetch(staticFile(`recordings/${props.id}.json`));
  if (!res.ok) throw new Error(`No recording for ${props.id} — run \`npm run record\` first.`);
  const timeline = (await res.json()) as Timeline;
  return { durationInFrames: totalFrames(timeline), props: { ...props, timeline } };
};

export const Root = () => (
  <Folder name={config.name}>
    {episodes.map((ep, i) => (
      <Composition
        key={ep.id}
        id={`ep${ep.id}`}
        component={Episode}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 10}
        defaultProps={{ id: ep.id, number: i + 1, total: episodes.length, next: episodes[i + 1]?.title ?? null, timeline: null }}
        calculateMetadata={calculateMetadata}
      />
    ))}
  </Folder>
);
