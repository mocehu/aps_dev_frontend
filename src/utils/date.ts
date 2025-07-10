// 封装一个时间的函数用来判断上午、下午、晚上

export const getTime = () => {
  const hours = new Date().getHours() + 1;
  let shichen = '';
  if (hours >= 6 && hours <= 11) {
    shichen = '早上好';
  } else if (hours > 11 && hours <= 14) {
    shichen = '中午好';
  } else if (hours > 14 && hours <= 19) {
    shichen = '下午好';
  } else if (hours > 19 && hours <= 23) {
    shichen = '晚上好';
  } else {
    shichen = '深夜了';
  }
  return shichen;
};
