setup:
	cp -r ../wagtail_drawer .
	docker-compose build
	docker-compose up
	docker-compose exec web "./manage.py" "loaddata" "data.json"
