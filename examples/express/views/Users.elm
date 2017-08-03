module Users exposing (view)

import Html exposing (Html, h1, div, text, ul, li)
import Json.Encode
import Json.Decode exposing (decodeValue, list, string)
import Json.Decode.Pipeline exposing (decode, required)


-- Model


type alias UsersContext =
    { users : List String }


titleContext : Json.Encode.Value -> Result String UsersContext
titleContext =
    decode UsersContext
        |> required "users" (list string)
        |> decodeValue



-- View


view : msg -> Json.Encode.Value -> Result String (Html msg)
view msg jsonCtx =
    titleContext jsonCtx
        |> Result.map render


render : UsersContext -> Html msg
render ctx =
    div
        []
        [ h1 [] [ text "Users" ]
        , ul [] <| List.map user ctx.users
        ]


user : String -> Html msg
user name =
    li [] [ text name ]
