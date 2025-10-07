
const ALLOWED_TIME_SLOTS = [
  { start: 8, end: 12 },   
  { start: 13, end: 16 },  
  { start: 17, end: 20 }   
];

export function isWithinAllowedTime() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  const currentTimeInMinutes = currentHour * 60 + currentMinute;
  
  return ALLOWED_TIME_SLOTS.some(slot => {
    const startTimeInMinutes = slot.start * 60;
    const endTimeInMinutes = slot.end * 60;
    
    return currentTimeInMinutes >= startTimeInMinutes && 
           currentTimeInMinutes <= endTimeInMinutes;
  });
}

export function getNextAllowedTime() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;
  
  // Find the next time slot that hasn't started yet
  const nextSlot = ALLOWED_TIME_SLOTS
    .map(slot => ({
      start: slot.start * 60,
      end: slot.end * 60
    }))
    .sort((a, b) => a.start - b.start)
    .find(slot => slot.start > currentTimeInMinutes);
  
  if (nextSlot) {
    const nextHour = Math.floor(nextSlot.start / 60);
    return `${nextHour}:00`;
  }
  
  // If no more slots today, return first slot of next day
  const firstSlot = ALLOWED_TIME_SLOTS[0];
  return `พรุ่งนี้เวลา ${firstSlot.start}:00`;
}
