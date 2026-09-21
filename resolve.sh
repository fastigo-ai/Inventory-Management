sed -i '' -e 's/<<<<<<< Updated upstream//g' -e 's/=======//g' -e 's/>>>>>>> Stashed changes//g' -e 's/const storeRegex = new RegExp(`^\\\\s\*(${expandedStoreNames.join('\''|'\'')})\\\\b`, '\''i'\'');//g' backend/src/modules/store/store.controller.ts
sed -i '' -e 's/<<<<<<< Updated upstream//g' -e 's/=======//g' -e 's/>>>>>>> Stashed changes//g' -e 's/limit: limit,//g' frontend/src/app/di/page.tsx
git add backend/src/modules/store/store.controller.ts frontend/src/app/di/page.tsx
