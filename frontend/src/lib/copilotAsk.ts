/** Link that opens the Copilot and sends `question` straight away (the Copilot page reads `?q=`). */
export const copilotUrl = (question?: string) => {
  const q = (question ?? '').trim();
  return q ? `/app/copilot?q=${encodeURIComponent(q)}` : '/app/copilot';
};
