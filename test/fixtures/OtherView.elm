module OtherView exposing (view)

import Html exposing (Html, h1, div, text)
import Json.Encode
import InvalidView


view : Json.Encode.Value -> Result String (Html ())
view jsonCtx =
    Ok render


render : Html ()
render =
    div
        []
        [ h1 []
            [ text "Hello!"
            ]
        ]
