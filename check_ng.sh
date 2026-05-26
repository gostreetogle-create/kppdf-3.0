npx ng serve --host 0.0.0.0 --port 4200 > ng.log 2>&1 &
PID=$!
count=0
while ! grep -q "Compiled successfully" ng.log && [ $count -lt 30 ]; do
  sleep 1
  count=$((count+1))
done
curl -s http://localhost:4200 | head -3
echo '---NG_STATUS---'
kill $PID
