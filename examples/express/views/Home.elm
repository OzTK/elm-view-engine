module Views.Home exposing (view, context)

import Html exposing (Html, h1, div, text)
import Json.Decode exposing (string)
import Json.Decode.Pipeline exposing (decode, required)


context : Json.Decode.Decoder ()
context =
    decode ()


view : () -> Html Never
view _ =
    div
        []
        [ h1 []
            [ text ("Hello !")
            ]
        ]
