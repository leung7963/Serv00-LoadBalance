export default {
	async fetch(request, env, ctx) {
		let url = new URL(request.url);
		const 访问路径 = url.pathname;
		const 访问参数 = url.search;

		// 获取后端域名列表
		let 后端域名 = [
			'serv00-s8.0662.pp.ua',
			'serv00-s10.0662.pp.ua',
			'serv00-s10-1.0662.pp.ua',
			'serv00-s11.0662.pp.ua',
			'serv00-s12.0662.pp.ua',
			'serv00-s13.0662.pp.ua',
			'serv00-s13-1.0662.pp.ua',
			'serv00-s14.0662.pp.ua',
			'serv00-s14-1.0662.pp.ua',
			'serv00-s15.0662.pp.ua',
			'serv00-s15-1.0662.pp.ua',
			'serv00-s16.0662.pp.ua',
			'serv00-s16-1.0662.pp.ua',
			'hax.0662.pp.ua',
			'lade.0662.pp.ua',
			'euserv.0662.pp.ua'];
		if (env.HOST) 后端域名 = await ADD(env.HOST);

		// 获取配置参数
		let 测试路径 = env.PATH || '/';
		if (测试路径.charAt(0) !== '/') 测试路径 = '/' + 测试路径;
		let 响应代码 = env.CODE || '404';

		// 封装带超时的fetch请求
		async function fetchWithTimeout(resource, timeout = 1618) {
			const controller = new AbortController();
			const id = setTimeout(() => controller.abort(), timeout);
			
			const start = Date.now();
			try {
				const response = await fetch(resource, {
					signal: controller.signal
				});
				const duration = Date.now() - start;
				return { response, duration };
			} finally {
				clearTimeout(id);
			}
		}

		// 并发测试所有后端
		const 用户URL = new URL(request.url);
		const [测试Path, 测试Query] = 测试路径.split('?');
		
		const 测试请求 = 后端域名.map(async backend => {
			const testUrl = new URL(用户URL);
			testUrl.hostname = backend;
			testUrl.pathname = 测试Path;
			testUrl.search = 测试Query || '';

			try {
				const { response, duration } = await fetchWithTimeout(testUrl.toString());
				const 状态符合 = response.status.toString() === 响应代码;
				return { backend, duration, ok: 状态符合 };
			} catch (error) {
				return { backend, duration: Infinity, ok: false };
			}
		});

		// 等待所有测试结果
		const 测试结果 = await Promise.all(测试请求);
		const 有效后端 = 测试结果.filter(res => res.ok);

		// 如果没有可用后端
		if (有效后端.length === 0) {
			return new Response('所有后端都不可用', {
				status: 502,
				headers: { 'content-type': 'text/plain; charset=utf-8' }
			});
		}

		// 选择响应最快的前端
		const 最快后端 = 有效后端.reduce((prev, curr) => 
			prev.duration < curr.duration ? prev : curr
		);

		// 构造最终请求URL
		const targetUrl = new URL(request.url);
		targetUrl.hostname = 最快后端.backend;
		targetUrl.pathname = 访问路径;
		targetUrl.search = 访问参数;

		// 转发原始请求
		return fetch(new Request(targetUrl, request));
	}
}

async function ADD(envadd) {
	const addtext = envadd.replace(/[	 |"'\r\n]+/g, ',').replace(/,+/g, ',');
	return addtext.replace(/^,|,$/g, '').split(',');
}