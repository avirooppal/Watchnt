export type MessageType = 'PING' | 'START_CAPTURE' | 'STOP_CAPTURE' | 'AUTH_STATUS';

export interface ExtensionMessage {
  type: MessageType;
  payload?: any;
}

export const sendMessageToBackground = async (message: ExtensionMessage): Promise<any> => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve(response);
    });
  });
};
