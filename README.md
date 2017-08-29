# elm-view-engine [![npm](https://img.shields.io/npm/v/elm-view-engine.svg)](https://www.npmjs.com/package/elm-view-engine) [![Build Status](https://travis-ci.org/OzTK/elm-view-engine.svg?branch=master)](https://travis-ci.org/OzTK/elm-view-engine) [![Coverage Status](https://coveralls.io/repos/github/OzTK/elm-view-engine/badge.svg?branch=master)](https://coveralls.io/github/OzTK/elm-view-engine?branch=master) [![Known Vulnerabilities](https://snyk.io/test/github/OzTK/elm-view-engine/badge.svg)](https://snyk.io/test/github/OzTK/elm-view-engine)

Renders elm views from a directory of elm modules. This can and is meant to be plugged into Express as a template engine.

The 2 simple goals of this project are:

* Allowing to reuse elm views when rendering the page the first time, avoiding to have a duplicate html view in the case of a multi-page app doing server-side rendering

* Building views uniformly with the same technology (Elm!) and avoid having another template language in the stack.

## Getting Started

### Prerequisites

Elm needs to be installed either globally or locally in the project.

``` shell
> npm i -g elm
```
or

``` shell
> npm i elm
```

### Installing

```shell
> npm i elm-view-engine
```

### Usage

You can use the view engine by itself to being able to render a directory of elm views, or you can plug it in to express as a view engine.

#### Standalone use

Typescript:
```typescript
import { configure, Options } from "elm-view-engine";

configure(new Options("path/to/my/views", "path/to/elm/root")).then((engine) => {
  const someContext = {
    arrayOfUsers: [ "Paul", "Jack", "Barbara" ];
  };
  const viewContent = engine.getView("UsersView", someContext);
  // Do something with the html
}));
```

Javascript:
```javascript
var eve = require('elm-view-engine');

var options = {
  viewsDirPath: 'path/to/my/views',
  projectRoot: 'path/to/elm/root',
};

eve.configure(options).then((engine) => {
  const someContext = {
    arrayOfUsers: [ 'Paul', 'Jack', 'Barbara' ],
  };
  const viewContent = engine.getView('UsersView', someContext);
  // Do something with the html
}));
```

#### Express integration

Just call the configure function passing your express app in the options:

Typescript:
```typescript
import { configure, Options } from "elm-view-engine";
import * as express from "express";

const app = express();

configure(new Options("path/to/my/views", "path/to/elm/root", app)).then(() => {
  // app template engine is ready
  app.use(...);
}));
```

Javascript:
```javascript
var eve = require('elm-view-engine');
var express = require('express');

var app = express();

var options = {
  viewsDirPath: 'path/to/my/views',
  projectRoot: 'path/to/elm/root',
  expressApp: app,
};

eve.configure(options).then(() => {
  // app template engine is ready
  app.use(...);
}));
```

#### Views

Your elm views must expose 2 functions with the following signatures:

```elm
view : MyContext -> Html MyMsg
context : Json.Decode.Decoder MyContext
```

If they don't, views compilation will fail.

* MyContext is a record defining the structure of the context passed to the view. If you don't need any context for your view, you can use the following template:
```elm
context : Json.Decode.Decoder ()
context =
    decode ()


view : () -> Html Never
view _ =
    -- Code for your view
```
* `context` returns a decoder for the context that will deserialize the json context internally to the engine
* Passing an invalid context when requesting a view will result in an error from the engine

##### Example

A view with a simple context:

```elm
module Greeter exposing (view, context)

import Html exposing (Html, h1, div, text)
import Json.Encode
import Json.Decode exposing (decodeValue, string)
import Json.Decode.Pipeline exposing (decode, required)


-- Model


type alias SimpleContext =
    { simpleName : String }


context : Json.Decode.Decoder SimpleContext
context =
    decode SimpleContext
        |> required "simpleName" string



-- View


view : SimpleContext -> Html Never
view ctx =
    div
        []
        [ h1 []
            [ text ("Hello " ++ ctx.simpleName ++ "!")
            ]
        ]
```

## Running the tests

Just `git clone https://github.com/OzTK/elm-view-engine` and run the `npm test` command from the root of the project. You can check the coverage by running `npm run coverage:local`.

## Built With

Because of the dynamic nature of the project, I had to generate elm code (the template for the module is src/MainTemplate.elm). I also needed to compile this generated elm code on the fly (when you call configure()) and render elm views into html strings. I relied on the following libraries for this purpose:

* [elm-server-side-renderer](https://github.com/eeue56/elm-server-side-renderer): rendering elm views to strings
* [node-elm-compiler](https://github.com/rtfeldman/node-elm-compiler): compiling elm code inside the module
* [handlebars](http://handlebarsjs.com/): templating/generating the elm code

## Contributing

Please feel free to open issues for any concerns. PRs welcome!