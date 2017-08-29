module InvalidView exposing (view)

import Html exposing (Html, h1, div, text)
import Json.Encode


view : Json.Encode.Value -> Result String (Html (Never -> Never))
view jsonCtx =
    Ok render


render : Html (Never -> Never)
render =
    div
        []
        [ h1 []
            [ text "Hello!"
            ]
        ]
