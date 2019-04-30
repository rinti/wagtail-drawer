# Use an official Python runtime as a parent image
FROM python:3.7
LABEL maintainer="hello@rinti.se"

# Set environment varibles
ENV PYTHONUNBUFFERED 1
ENV DJANGO_ENV dev

COPY ./requirements.txt /code/requirements.txt
RUN pip install --upgrade pip
# Install any needed packages specified in requirements.txt
RUN pip install -r /code/requirements.txt
RUN pip install pywatchman

# Copy the current directory contents into the container at /code/
COPY . /code/
# Set the working directory to /code/
WORKDIR /code/

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["runserver"]
