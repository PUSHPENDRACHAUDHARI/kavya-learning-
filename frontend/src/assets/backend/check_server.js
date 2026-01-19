(async () => {
  try {
    const res = await fetch('http://localhost:5000/api');
    console.log('status', res.status);
    const t = await res.text();
    console.log(t.slice(0, 200));
  } catch (e) {
    console.error('err', e.message);
  }
})();
