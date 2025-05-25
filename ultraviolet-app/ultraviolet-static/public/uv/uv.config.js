/*global Ultraviolet*/
self.__uv$config = {
	prefix: "/service/",
	encodeUrl: async function(url) {
		// Example async encoding logic for testing
		return new Promise((resolve) => {
			setTimeout(() => {
				resolve(Ultraviolet.codec.xor.encode(url));
			}, 10);
		});
	},
	decodeUrl: Ultraviolet.codec.xor.decode,
	handler: "/uv/uv.handler.js",
	client: "/uv/uv.client.js",
	bundle: "/uv/uv.bundle.js",
	config: "/uv/uv.config.js",
	sw: "/uv/uv.sw.js",
};
