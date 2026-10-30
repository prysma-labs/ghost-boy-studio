export const AGENTS = [
  {
    id: "director",
    name: "Director",
    blurb: "Creative direction and storyboards",
  },
  {
    id: "designer",
    name: "Designer",
    blurb: "Character sheets, prop sheets, and looks",
  },
  {
    id: "writer",
    name: "Writer",
    blurb: "Script and storyline",
  },
  {
    id: "musician",
    name: "Musician",
    blurb: "Score, songs, and sound",
  },
  {
    id: "animator",
    name: "Animator",
    blurb: "The finished animation",
  },
] as const;

export type AgentId = (typeof AGENTS)[number]["id"];

const URL_ENV: Record<AgentId, string> = {
  director: "AGENT_URL_DIRECTOR",
  designer: "AGENT_URL_DESIGNER",
  writer: "AGENT_URL_WRITER",
  musician: "AGENT_URL_MUSICIAN",
  animator: "AGENT_URL_ANIMATOR",
};

export function isAgentId(value: string): value is AgentId {
  return Object.prototype.hasOwnProperty.call(URL_ENV, value);
}

export function agentById(id: string) {
  return AGENTS.find((agent) => agent.id === id);
}

export function agentBaseUrl(agentId: AgentId, env: NodeJS.ProcessEnv = process.env) {
  const key = URL_ENV[agentId];
  const value = env[key]?.trim();
  if (!value) throw new Error(`Missing ${key}`);
  return value.replace(/\/$/, "");
}
