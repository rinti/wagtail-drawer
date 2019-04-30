# wagtail-drawer

A wagtail-app to visualize the page structure like a drawer with different levels

## Getting Started

### Installing

To install it just pip install like this
```
pip install wagtail-drawer
```

## Contributing

Create an issue or start a pull request

### Developing

Disclaimer: This is unfortunately very biased to my setup at the moment (OSX). So I'm not sure this works exactly the same on windows/linux.

1. `cd wagtail_drawer_test_app`
2. `make setup`
2. `make loaddata` (optional, will create some initial page structure and admin user)
3. you can now start working at http://localhost:8000/admin with user: admin, password: admin :)

For frontend developing:

1. Follow the instructions for backend to set that up
2. `cd frontend && npm i`
3. `npm run dev`
4. When making changes `make update` in the wagtail_drawer_test_app folder.


### Coding style

Code should be formatted with black


### Running the tests

```
make test
```

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/rinti/wagtail-drawer/tags). 

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
