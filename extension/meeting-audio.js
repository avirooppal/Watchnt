// Runs in the meeting page. Retains references only; capture starts on an
// explicit extension request. Existing meeting tracks are never stopped.
(() => {
  const displayStreams = new Set();
  const devices = navigator.mediaDevices;
  if (!devices?.getDisplayMedia) return;
  const originalDisplay = devices.getDisplayMedia.bind(devices);
  let peer, audio, microphone, presentation, session;
  const sources = new Map();
  function attach(stream) {
    if (
      !audio ||
      !presentation ||
      sources.has(stream) ||
      !stream.getAudioTracks().some((t) => t.readyState === "live")
    )
      return;
    const node = audio.createMediaStreamSource(
      new MediaStream(stream.getAudioTracks()),
    );
    node.connect(presentation);
    sources.set(stream, node);
  }
  devices.getDisplayMedia = async (...args) => {
    const stream = await originalDisplay(...args);
    displayStreams.add(stream);
    try {
      attach(stream);
    } catch {
      stop();
    }
    return stream;
  };
  function stop() {
    session = undefined;
    peer?.close();
    peer = undefined;
    microphone?.getTracks().forEach((t) => t.stop());
    microphone = undefined;
    sources.forEach((node) => node.disconnect());
    sources.clear();
    void audio?.close();
    audio = undefined;
    presentation = undefined;
  }
  async function prepare(id) {
    stop();
    session = id;
    const acquired = await devices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    if (session !== id) {
      acquired.getTracks().forEach((t) => t.stop());
      return;
    }
    microphone = acquired;
    audio = new AudioContext();
    await audio.resume();
    presentation = audio.createMediaStreamDestination();
    for (const stream of displayStreams) {
      if (!stream.getAudioTracks().some((t) => t.readyState === "live"))
        displayStreams.delete(stream);
      else attach(stream);
    }
    peer = new RTCPeerConnection({ iceServers: [] });
    peer.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(peer?.connectionState))
        stop();
    };
    peer.addTrack(microphone.getAudioTracks()[0], microphone);
    peer.addTrack(presentation.stream.getAudioTracks()[0], presentation.stream);
    await peer.setLocalDescription(await peer.createOffer());
    await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(Error("Meeting audio connection timed out.")),
        5000,
      );
      const ready = () => {
        if (peer?.iceGatheringState === "complete") {
          clearTimeout(timer);
          resolve();
        }
      };
      peer.onicegatheringstatechange = ready;
      ready();
    });
    return {
      sdp: peer.localDescription.toJSON(),
      microphoneId: microphone.id,
      presentationId: presentation.stream.id,
    };
  }
  window.addEventListener("message", async (event) => {
    if (
      event.source !== window ||
      event.data?.channel !== "watchnt-audio-request"
    )
      return;
    const { id, command, payload } = event.data;
    if (typeof id !== "string") return;
    try {
      let result;
      if (command === "prepare") result = await prepare(id);
      else if (command === "answer" && peer) {
        await peer.setRemoteDescription(payload);
        result = {};
      } else if (command === "stop") {
        stop();
        result = {};
      } else return;
      window.postMessage(
        { channel: "watchnt-audio-response", id, result },
        location.origin,
      );
    } catch (error) {
      stop();
      window.postMessage(
        { channel: "watchnt-audio-response", id, error: String(error) },
        location.origin,
      );
    }
  });
  window.addEventListener("pagehide", stop);
})();
