-- 添加 point_transactions 到 events 的外键关系
ALTER TABLE "point_transactions" 
ADD CONSTRAINT "point_transactions_eventId_fkey" 
FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
