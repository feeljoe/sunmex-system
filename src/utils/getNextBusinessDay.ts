export function getNextBusinessDay(date: Date) {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
  
    const day = next.getDay(); // 0 = Sun, 6 = Sat
  
    if (day === 6) {
      // Saturday → Monday
      next.setDate(next.getDate() + 2);
    } else if (day === 0) {
      // Sunday → Monday
      next.setDate(next.getDate() + 1);
    }
  
    next.setHours(0, 0, 0, 0);
    return next;
  }
  