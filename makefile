server:
	python -m SimpleHTTPServer 3000
build:
	yarn build
index:
	vue serve src/index.vue
add:
	yarn build
	git add .

