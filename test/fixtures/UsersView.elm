module UsersView exposing (view, context)

import Html exposing (Html, body, h1, h3, header, div, ul, li, a, text, node, p)
import Html.Attributes exposing (rel, attribute, href, src, id, class, charset, name)
import Json.Decode exposing (Decoder)
import Json.Decode.Pipeline exposing (decode)


context : Decoder ()
context =
    decode ()


view : () -> Html Never
view _ =
    div [ id "app" ]
        [ h1 [] [ text "My Page" ]
        , p [] [ text "My Content" ]
        ]
        |> layout


layout : Html.Html Never -> Html.Html Never
layout content =
    node "html"
        []
        [ node "head" [] <|
            ([ node "meta" [ charset "utf-8" ] []
             , node "meta" [ attribute "http-equiv" "X-UA-Compatible", Html.Attributes.content "dzn" ] []
             , node "meta" [ name "viewport", Html.Attributes.content "width=device-width, initial-scale=1" ] []
             , node "title" [] [ text "It works!!!" ]
             ]
            )
        , body [] <|
            ([ header []
                [ h3 [] [ text "Welcome in my test view" ]
                , ul []
                    [ li [] [ a [ href "/" ] [ text "Home" ] ]
                    , li [] [ a [ href "/users" ] [ text "Users" ] ]
                    ]
                ]
             , div [] [ content ]
             ]
            )
        ]
