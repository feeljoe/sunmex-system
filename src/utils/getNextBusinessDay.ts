import { DateTime } from "luxon";
export function getNextBusinessDay(date: Date) {
  let newDate = DateTime.fromJSDate(date, {zone: "America/Phoenix" });
  //always add one more day
  newDate = newDate.plus({days: 1});
  //if day is saturday, set it to monday
  if(newDate.weekday === 6){
    newDate = newDate.plus({days: 2});
  }
  //if day is sunday, set it to monday
  else if(newDate.weekday === 7){
    newDate = newDate.plus({days: 1});
  }
  newDate = newDate.startOf("day");
  return newDate.toUTC().toJSDate();
}