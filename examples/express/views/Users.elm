module Views.Users exposing (view, context)

import Html exposing (Html, h1, div, text, ul, li)
import Json.Decode exposing (decodeValue, list, string)
import Json.Decode.Pipeline exposing (decode, required)
import Search


-- Model


type alias UsersContext =
    { users : List String }


context : Json.Decode.Decoder UsersContext
context =
    decode UsersContext
        |> required "users" (list string)



-- View


view : UsersContext -> Html Search.Msg
view ctx =
    div
        []
        [ h1 [] [ text "Users" ]
        , Search.view (Search.search "")
        , ul [] <| List.map user ctx.users
        ]


user : String -> Html msg
user name =
    li [] [ text name ]
