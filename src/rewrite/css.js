import EventEmitter from "events";

class CSS extends EventEmitter {
	constructor(ctx) {
		super();
		this.ctx = ctx;
		this.meta = ctx.meta;
	}
	rewrite(str, options) {
		return this.recast(str, options, "rewrite");
	}
	source(str, options) {
		return this.recast(str, options, "source");
	}

	async recast(str, options, type) {
		// regex from vk6 (https://github.com/ading2210)
		const urlRegex = /url\(['"]?(.+?)['"]?\)/gm;
		const Atruleregex =
			/@import\s+(url\s*?\(.{0,9999}?\)|['"].{0,9999}?['"]|.{0,9999}?)(\$|\s|;)/gm;
		str = new String(str).toString();
		str = await replaceAsync(str, urlRegex, async (match, url) => {
			const encodedUrl =
				type === "rewrite"
					? await this.ctx.rewriteUrl(url)
					: await this.ctx.sourceUrl(url);
			return match.replace(url, encodedUrl);
		});
		str = await replaceAsync(str, Atruleregex, async (match, importStatement) => {
			return await replaceAsync(
				importStatement,
				/^(url\(['"]?|['"]|)(.+?)(['"]|['"]?\)|)$/gm,
				async (match, firstQuote, url, endQuote) => {
					if (firstQuote.startsWith("url")) {
						return match;
					}
					const encodedUrl =
						type === "rewrite"
							? await this.ctx.rewriteUrl(url)
							: await this.ctx.sourceUrl(url);
					return `${firstQuote}${encodedUrl}${endQuote}`;
				}
			);
		});
		return str;
	}
}

// Helper for async string replace
async function replaceAsync(str, regex, asyncFn) {
	const promises = [];
	str.replace(regex, (match, ...args) => {
		const promise = asyncFn(match, ...args);
		promises.push(promise);
		return match;
	});
	const data = await Promise.all(promises);
	return str.replace(regex, () => data.shift());
}

export default CSS;
