module OtherView exposing (view)

import Html exposing (Html, h1, div, text)
import Json.Encode
import InvalidView


view : msg -> Json.Encode.Value -> Result String (Html msg)
view msg jsonCtx =
    Ok render


render : Html msg
render =
    div
        []
        [ h1 []
            [ text "Hello!"
            ]
        ]
