export const articleRoot = (entry: any) => entry.data?.contentKind === 'personal' ? '/journal' : '/articles';
export const articlePath = (entry: any) => `${articleRoot(entry)}/${encodeURIComponent(entry.id)}`;
