import HTML from "./html.js";
import CSS from "./css.js";
import JS from "./js.js";
import setCookie from "set-cookie-parser";
import { xor, base64, plain } from "./codecs.js";
import {
	validateCookie,
	db,
	getCookies,
	setCookies,
	serialize,
} from "./cookie.js";
import {
	attributes,
	isUrl,
	isForbidden,
	isHtml,
	isSrcset,
	isStyle,
	text,
	injectHead,
	createHtmlInject,
	createJsInject,
} from "./rewrite.html.js";
//import { call, destructureDeclaration, dynamicImport, getProperty, importDeclaration, setProperty, sourceMethods, wrapEval, wrapIdentifier } from './rewrite.script.js';
import {
	dynamicImport,
	importMeta,
	identifier,
	importDeclaration,
	property,
	unwrap,
	wrapEval,
} from "./rewrite.script.js";
import { openDB } from "idb";
import { BareClient } from "@mercuryworkshop/bare-mux";
import EventEmitter from "events";

/**
 * @typedef {import('../uv.js').UVConfig} UVConfig
 */

class Ultraviolet {
	/**
	 *
	 * @param {UVConfig} [options]
	 */
	constructor(options = {}) {
		this.prefix = options.prefix || "/service/";
		//this.urlRegex = /^(#|about:|data:|mailto:|javascript:)/;
		this.urlRegex = /^(#|about:|data:|mailto:)/;
		this.rewriteUrl = options.rewriteUrl || this.rewriteUrl;
		this.rewriteImport = options.rewriteImport || this.rewriteImport;
		this.sourceUrl = options.sourceUrl || this.sourceUrl;
		// Wrap encodeUrl and decodeUrl to always return a Promise
		const wrapAsync = (fn, fallback) => {
			if (!fn) return async (...args) => fallback(...args);
			return async (...args) => {
				const result = fn(...args);
				return result instanceof Promise ? await result : result;
			};
		};
		this.encodeUrl = wrapAsync(options.encodeUrl, encodeURIComponent);
		this.decodeUrl = wrapAsync(options.decodeUrl, decodeURIComponent);
		this.vanilla = "vanilla" in options ? options.vanilla : false;
		this.meta = options.meta || {};
		this.meta.base ||= undefined;
		this.meta.origin ||= "";
		this.bundleScript = options.bundle || "/uv.bundle.js";
		this.handlerScript = options.handler || "/uv.handler.js";
		this.clientScript =
			options.client &&
			(options.bundle &&
				options.bundle.includes("uv.bundle.js") &&
				options.bundle.replace("uv.bundle.js", "uv.client.js")) ||
			"/uv.client.js";
		this.configScript = options.config || "/uv.config.js";
		this.meta.url ||= this.meta.base || "";
		this.codec = Ultraviolet.codec;
		this.html = new HTML(this);
		this.css = new CSS(this);
		this.js = new JS(this);
		this.openDB = this.constructor.openDB;
		this.master = "__uv";
		this.dataPrefix = "__uv$";
		this.attributePrefix = "__uv";
		this.createHtmlInject = createHtmlInject;
		this.createJsInject = createJsInject;
		this.attrs = {
			isUrl,
			isForbidden,
			isHtml,
			isSrcset,
			isStyle,
		};
		if (!this.vanilla) this.implementUVMiddleware();
		this.cookie = {
			validateCookie,
			db: () => {
				return db(this.constructor.openDB);
			},
			getCookies,
			setCookies,
			serialize,
			setCookie,
		};
	}
	/**
	 *
	 * @param {string} str Script being imported
	 * @param {string} src Script that is importing
	 * @param {*} meta
	 */
	rewriteImport(str, src, meta = this.meta) {
		// use importiing script as the base
		return this.rewriteUrl(str, {
			...meta,
			base: src,
		});
	}
	async rewriteUrl(str, meta = this.meta) {
		str = new String(str).trim();
		if (!str || this.urlRegex.test(str)) return str;

		if (str.startsWith("javascript:")) {
			return "javascript:" + this.js.rewrite(str.slice("javascript:".length));
		}

		try {
			const encoded = await this.encodeUrl(new URL(str, meta.base).href);
			return meta.origin + this.prefix + encoded;
		} catch (e) {
			const encoded = await this.encodeUrl(str);
			return meta.origin + this.prefix + encoded;
		}
	}

	async sourceUrl(str, meta = this.meta) {
		if (!str || this.urlRegex.test(str)) return str;
		try {
			const decoded = await this.decodeUrl(str.slice(this.prefix.length + meta.origin.length));
			return new URL(decoded, meta.base).href;
		} catch (e) {
			return await this.decodeUrl(str.slice(this.prefix.length + meta.origin.length));
		}
	}
	encodeUrl(str) {
		return encodeURIComponent(str);
	}
	decodeUrl(str) {
		return decodeURIComponent(str);
	}
	implementUVMiddleware() {
		// HTML
		attributes(this);
		text(this);
		injectHead(this);
		// JS
		importDeclaration(this);
		dynamicImport(this);
		importMeta(this);
		property(this);
		wrapEval(this);
		identifier(this);
		unwrap(this);
	}
	get rewriteHtml() {
		return this.html.rewrite.bind(this.html);
	}
	get sourceHtml() {
		return this.html.source.bind(this.html);
	}
	get rewriteCSS() {
		return this.css.rewrite.bind(this.css);
	}
	get sourceCSS() {
		return this.css.source.bind(this.css);
	}
	get rewriteJS() {
		return this.js.rewrite.bind(this.js);
	}
	get sourceJS() {
		return this.js.source.bind(this.js);
	}
	static codec = { xor, base64, plain };
	static setCookie = setCookie;
	static openDB = openDB;
	static BareClient = BareClient;
	static EventEmitter = EventEmitter;
}

export default Ultraviolet;
if (typeof self === "object") self.Ultraviolet = Ultraviolet;
