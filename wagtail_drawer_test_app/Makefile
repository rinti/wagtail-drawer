setup:
	cp -r ../wagtail_drawer .
	docker-compose build
	docker-compose up

loaddata:
	docker-compose exec web "./manage.py" "loaddata" "data.json"

update:
	cp -r ../wagtail_drawer .
