module OtherView exposing (view, context)

import Html exposing (Html, h1, div, text)
import InvalidView
import Json.Decode exposing (Decoder)
import Json.Decode.Pipeline exposing (decode)


context : Decoder ()
context =
    decode ()


view : () -> Html Never
view _ =
    render


render : Html Never
render =
    div
        []
        [ h1 []
            [ text "Hello!"
            ]
        ]
