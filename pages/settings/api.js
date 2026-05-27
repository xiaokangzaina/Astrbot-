export function createApi(bridge) {
  const apiGet = bridge?.apiGet?.bind(bridge);
  const apiPost = bridge?.apiPost?.bind(bridge);
  if (!apiGet || !apiPost) {
    throw new Error("Bridge API is unavailable");
  }
  function unwrap(response) {
    if (response && typeof response === "object" && Object.prototype.hasOwnProperty.call(response, "ok")) {
      if (!response.ok) throw new Error(response.message || "Request failed");
      return Object.prototype.hasOwnProperty.call(response, "data") ? response.data : response;
    }
    return response;
  }
  return {
    safeGet: async (endpoint, params) => unwrap(await apiGet(endpoint, params)),
    safePost: async (endpoint, body) => unwrap(await apiPost(endpoint, body)),
  };
}
