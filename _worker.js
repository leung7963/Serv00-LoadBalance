export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env);
  }
}

// 从环境变量获取服务器列表
function getServers(env) {
  return env.SERVERS.split('\n').map(s => s.trim()).filter(Boolean);
}

// 并行请求所有服务器，返回第一个成功响应
async function fetchInParallel(request, servers) {
  const promises = servers.map(server => {
    let url = new URL(request.url);
    url.hostname = server;

    // 克隆原始请求
    let newRequest = new Request(url.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.clone().body,
      redirect: request.redirect
    });

    return fetch(newRequest).catch(err => {
      console.error(`Server ${server} failed:`, err);
      return Promise.reject(err); // 保持拒绝状态以用于错误处理
    });
  });

  return Promise.any(promises);
}

// 处理请求
async function handleRequest(request, env) {
  const servers = getServers(env);

  if (servers.length === 0) {
    return new Response('No servers configured', { status: 500 });
  }

  try {
    const response = await fetchInParallel(request, servers);
    return response;
  } catch (error) {
    // 当所有请求都失败时返回502错误
    console.error('All servers failed:', error);
    return new Response('All servers failed', { status: 502 });
  }
}